import { prisma } from "@/lib/db";
import { MODELS } from "./models";
import { calcCostUsd } from "./pricing";
import { callAgent } from "./executor";
import { qaReview } from "./qa";
import { getPolicy } from "./config";
import type { Classification } from "./classifier";
import type { Plan, PlanStep } from "./plan";
import { stepLabel } from "./plan";
import { searchVaultContext, saveNoteToVault, isVaultConfigured } from "@/lib/obsidian/vault";
import { sendReport } from "./notify";
import { PROMPT_LIBRARY } from "@/prompts/library";

// AI COO Orchestrator（Day7）
// 依頼→分類→Agent選定→実行順序決定（plan.ts）→実行→レビュー(QA)→再実行判断→Obsidian保存→LINE報告
// - 承認ゲート: waiting_approval で停止し、承認後に同じ関数で再開（currentStep から）
// - 失敗: 各ステップ最大2回リトライ。QA不合格: 直前ステップをフィードバック付きで1回再生成

const MAX_STEP_RETRIES = 2;

// Vercel の実行時間制限(300s)内に収める実行予算。超過時は status="queued" に戻して
// 次の tick(/api/router/tick)が currentStep から再開する = DBベースのジョブキュー
const DEFAULT_BUDGET_MS = 240_000;

type Ctx = Record<string, string>; // stepName → output

function buildStepPrompt(
  step: PlanStep,
  input: string,
  ctx: Ctx,
  vaultBlock: string,
  feedback: string | null,
  promptBlock = ""
): string {
  const prior = Object.entries(ctx)
    .map(([name, out]) => `【${stepLabel(name)}の結果】\n${out.slice(0, 6000)}`)
    .join("\n\n");
  return [
    `依頼: ${input}`,
    step.instruction ? `【このステップの任務】${step.instruction}` : null,
    promptBlock || null,
    prior || null,
    feedback ? `【オーナー/QAからの修正指示 — 必ず反映すること】\n${feedback}` : null,
    vaultBlock || null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function recordStep(
  runId: string,
  step: { name: string; agent: string; model?: string | null; status: string },
  data: Partial<{
    fableReason: string | null;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    durationMs: number;
    output: string;
    error: string;
  }> = {}
) {
  return prisma.routerStep.create({
    data: {
      runId,
      name: step.name,
      agent: step.agent,
      model: step.model ?? null,
      status: step.status,
      fableReason: data.fableReason ?? null,
      inputTokens: data.inputTokens ?? 0,
      outputTokens: data.outputTokens ?? 0,
      costUsd: data.costUsd ?? 0,
      durationMs: data.durationMs,
      output: data.output?.slice(0, 10000),
      error: data.error,
    },
  });
}

async function addRunCost(runId: string, inputTokens: number, outputTokens: number, costUsd: number) {
  await prisma.routerRun.update({
    where: { id: runId },
    data: {
      inputTokens: { increment: inputTokens },
      outputTokens: { increment: outputTokens },
      costUsd: { increment: costUsd },
    },
  });
}

async function publishViaWebhook(runId: string, c: Classification, ctx: Ctx): Promise<string> {
  const url = process.env.N8N_PUBLISH_WEBHOOK_URL;
  if (!url) {
    return "投稿ワークフロー(N8N_PUBLISH_WEBHOOK_URL)未接続のため、承認済み下書きとして保存しました。手動で投稿してください。";
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-router-secret": process.env.ROUTER_WEBHOOK_SECRET ?? "",
    },
    body: JSON.stringify({
      runId,
      title: c.title,
      tags: c.tags,
      content: ctx.write ?? ctx.create_text ?? "",
      imagePrompt: ctx.image_prompt ?? "",
    }),
  });
  if (!res.ok) throw new Error(`投稿webhook失敗: HTTP ${res.status}`);
  return "n8n 投稿ワークフローへ送信しました（予約投稿）。";
}

/**
 * パイプライン実行（新規開始・承認後再開・tick再開のすべてで呼ぶ）
 * run.currentStep から plan.steps を順に実行する。
 * budgetMs を超えたら queued に戻して中断し、次の tick が続きを実行する。
 */
export async function runPipeline(
  runId: string,
  opts: { budgetMs?: number } = {}
): Promise<void> {
  const budgetMs = opts.budgetMs ?? DEFAULT_BUDGET_MS;
  const run = await prisma.routerRun.findUnique({ where: { id: runId } });
  if (!run || !run.plan || !run.classification) return;
  if (run.status === "done" || run.status === "rejected") return;

  const c = run.classification as unknown as Classification;
  const plan = run.plan as unknown as Plan;
  const startedAt = Date.now();

  await prisma.routerRun.update({ where: { id: runId }, data: { status: "running" } });

  try {
    const policy = await getPolicy();

    // Company OS（Obsidian）参照: ピン留めノート + 優先フォルダ検索
    const vault = await searchVaultContext(
      [c.domain, ...c.tags, c.title].join(" "),
      policy.pinnedNotes
    );
    const libPrompt = plan.promptId ? PROMPT_LIBRARY.find((p) => p.id === plan.promptId) : null;
    const promptBlock = libPrompt
      ? `【プロンプトライブラリ「${libPrompt.title}」— この様式・原則に従うこと】\n${libPrompt.body}`
      : "";

    const vaultBlock = vault.notes.length
      ? `【Company OS（Obsidian）の関連ノート — 判断の前提として必ず考慮】\n${vault.notes
          .map((n) => `--- ${n.path} ---\n${n.excerpt}`)
          .join("\n")}`
      : "";

    // 実行済みステップの出力を復元（承認後の再開・リトライ対応）
    const doneSteps = await prisma.routerStep.findMany({
      where: { runId, status: "done" },
      orderBy: { createdAt: "asc" },
    });
    const ctx: Ctx = {};
    for (const s of doneSteps) {
      if (s.output && !["classify", "qa"].includes(s.name)) ctx[s.name] = s.output;
    }

    let publishNote = "";

    for (let i = run.currentStep; i < plan.steps.length; i++) {
      const step = plan.steps[i];

      // 実行予算超過 → queued に戻して中断（tick が再開）
      if (Date.now() - startedAt > budgetMs) {
        await prisma.routerRun.update({
          where: { id: runId },
          data: { status: "queued", currentStep: i },
        });
        return;
      }

      if (step.kind === "approval") {
        if (!run.approvedAt) {
          // 承認キュー投入: 停止して承認依頼を通知
          await prisma.routerRun.update({
            where: { id: runId },
            data: { status: "waiting_approval", currentStep: i },
          });
          await recordStep(runId, { ...step, status: "waiting" });
          const draft = ctx.write ?? ctx[Object.keys(ctx)[Object.keys(ctx).length - 1]] ?? "";
          await sendReport({
            runId,
            status: "waiting_approval",
            title: c.title,
            source: run.source,
            agent: step.agent,
            model: "-",
            costUsd: Number(run.costUsd),
            estimatedUsd: plan.estimatedUsd,
            durationMs: Date.now() - startedAt,
            obsidianPath: null,
            summary: [
              `🟡 承認待ち「${c.title}」（${plan.approvalReason ?? "承認が必要な処理"}）`,
              ``,
              `--- 成果物プレビュー ---`,
              draft.slice(0, 1500),
              ``,
              `承認: 「承認 ${runId}」と返信`,
              `修正: 「却下 ${runId} 修正指示…」と返信`,
            ].join("\n"),
          });
          return; // 承認されたら approve API 経由で再開
        }
        await recordStep(runId, { ...step, status: "done" }, { output: `承認済み (${run.approvedBy})` });
        continue;
      }

      if (step.kind === "publish") {
        const t0 = Date.now();
        publishNote = await publishViaWebhook(runId, c, ctx);
        await recordStep(runId, { ...step, status: "done" }, { output: publishNote, durationMs: Date.now() - t0 });
        await prisma.routerRun.update({ where: { id: runId }, data: { currentStep: i + 1 } });
        continue;
      }

      if (step.kind === "qa") {
        const t0 = Date.now();
        const lastGenName = Object.keys(ctx)[Object.keys(ctx).length - 1];
        const verdict = await qaReview(run.input, ctx[lastGenName] ?? "");
        await recordStep(
          runId,
          { ...step, model: MODELS.HAIKU, status: "done" },
          {
            inputTokens: verdict.inputTokens,
            outputTokens: verdict.outputTokens,
            costUsd: verdict.costUsd,
            durationMs: Date.now() - t0,
            output: JSON.stringify({ pass: verdict.pass, feedback: verdict.feedback }),
          }
        );
        await addRunCost(runId, verdict.inputTokens, verdict.outputTokens, verdict.costUsd);

        if (!verdict.pass && lastGenName) {
          // 再実行判断: 直前の生成ステップをQAフィードバック付きで1回だけ再生成
          const genStep = plan.steps.find((s) => s.name === lastGenName && s.kind === "llm");
          if (genStep) {
            const t1 = Date.now();
            const redo = await callAgent({
              agent: genStep.agent,
              model: genStep.model ?? MODELS.SONNET,
              useWebSearch: genStep.useWebSearch,
              prompt: buildStepPrompt(genStep, run.input, ctx, vaultBlock, verdict.feedback, promptBlock),
            });
            ctx[lastGenName] = redo.output;
            const cost = calcCostUsd(redo.model, redo.inputTokens, redo.outputTokens);
            await recordStep(
              runId,
              { name: `${lastGenName}(QA修正)`, agent: genStep.agent, model: redo.model, status: "done" },
              {
                inputTokens: redo.inputTokens,
                outputTokens: redo.outputTokens,
                costUsd: cost,
                durationMs: Date.now() - t1,
                output: redo.output,
              }
            );
            await addRunCost(runId, redo.inputTokens, redo.outputTokens, cost);
          }
        }
        await prisma.routerRun.update({ where: { id: runId }, data: { currentStep: i + 1 } });
        continue;
      }

      // llm ステップ（リトライ最大2回）
      let lastError: unknown = null;
      for (let attempt = 0; attempt <= MAX_STEP_RETRIES; attempt++) {
        try {
          const t0 = Date.now();
          const res = await callAgent({
            agent: step.agent,
            model: step.model ?? MODELS.SONNET,
            useWebSearch: step.useWebSearch,
            prompt: buildStepPrompt(step, run.input, ctx, vaultBlock, run.feedback, step.name === "image_prompt" ? "" : promptBlock),
          });
          const cost = calcCostUsd(res.model, res.inputTokens, res.outputTokens);
          ctx[step.name] = res.output;
          await recordStep(
            runId,
            { ...step, model: res.model, status: "done" },
            {
              fableReason: step.model === MODELS.FABLE ? plan.decision.reason : null,
              inputTokens: res.inputTokens,
              outputTokens: res.outputTokens,
              costUsd: cost,
              durationMs: Date.now() - t0,
              output: res.output,
            }
          );
          await addRunCost(runId, res.inputTokens, res.outputTokens, cost);
          lastError = null;
          break;
        } catch (e) {
          lastError = e;
          if (attempt < MAX_STEP_RETRIES) await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        }
      }
      if (lastError) throw lastError;
      await prisma.routerRun.update({ where: { id: runId }, data: { currentStep: i + 1 } });
    }

    // 全ステップ完了 → Obsidian 保存 → 報告
    const finalRun = await prisma.routerRun.findUnique({ where: { id: runId } });
    const totalCost = Number(finalRun?.costUsd ?? 0);
    const mainOutput =
      ctx.write ?? ctx.think ?? Object.values(ctx)[Object.values(ctx).length - 1] ?? "";
    const body = Object.entries(ctx)
      .map(([name, out]) => (Object.keys(ctx).length > 1 ? `## ${stepLabel(name)}\n\n${out}` : out))
      .join("\n\n");

    const obsidianPath = await saveNoteToVault({
      title: c.title,
      body,
      intent: c.intent,
      domain: c.domain,
      tags: c.tags,
      runId,
      agent: plan.route.agent,
      model: plan.steps.find((s) => s.kind === "llm")?.model ?? MODELS.SONNET,
      costUsd: totalCost,
      vaultRefs: vault.notes.map((n) => n.path),
      noteStatus: plan.approvalRequired ? "approved" : "final",
    });

    const durationMs = Date.now() - startedAt;
    const summary = [
      `✅ 完了「${c.title}」`,
      `処理: ${plan.steps.map((s) => stepLabel(s.name)).join(" → ") || "単発回答"}`,
      `コスト: $${totalCost.toFixed(3)}（見積 $${plan.estimatedUsd.toFixed(3)}）`,
      obsidianPath
        ? `保存先: ${obsidianPath}`
        : isVaultConfigured()
          ? "保存先: 保存失敗"
          : "保存先: Vault未設定",
      publishNote || null,
      ``,
      `--- 結果 ---`,
      mainOutput.slice(0, 3000),
    ]
      .filter((v) => v !== null)
      .join("\n");

    await prisma.routerRun.update({
      where: { id: runId },
      data: { status: "done", resultSummary: summary, durationMs, obsidianPath },
    });

    await sendReport({
      runId,
      status: "done",
      title: c.title,
      source: run.source,
      agent: plan.route.agent,
      model: plan.steps.find((s) => s.kind === "llm")?.model ?? MODELS.SONNET,
      costUsd: totalCost,
      estimatedUsd: plan.estimatedUsd,
      durationMs,
      obsidianPath,
      summary,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.routerRun.update({
      where: { id: runId },
      data: { status: "error", error: message, durationMs: Date.now() - startedAt },
    });
    await sendReport({
      runId,
      status: "error",
      title: c.title,
      source: run.source,
      agent: "-",
      model: "-",
      costUsd: Number(run.costUsd),
      estimatedUsd: plan.estimatedUsd,
      durationMs: Date.now() - startedAt,
      obsidianPath: null,
      summary: `❌ 実行エラー「${c.title}」: ${message}\n再実行: 「再実行 ${runId}」と返信`,
    });
  }
}
