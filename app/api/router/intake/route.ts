import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { classify } from "@/lib/router/classifier";
import { getPolicy } from "@/lib/router/config";
import { decideThinkModel, fableSpentTodayUsd } from "@/lib/router/guard";
import { decideRoute } from "@/lib/router/routes";
import { executeRoute } from "@/lib/router/executor";
import { calcCostUsd } from "@/lib/router/pricing";
import { MODELS } from "@/lib/router/models";
import { saveNoteToVault, isVaultConfigured } from "@/lib/obsidian/vault";
import { verifyRouterSecret, sendReport } from "@/lib/router/notify";

export const maxDuration = 300; // Fable 5 は応答に時間がかかる

const IntakeSchema = z.object({
  input: z.string().min(1).max(20000), // 依頼（音声の場合は n8n で文字起こし済みテキスト）
  source: z.enum(["voice", "line", "web", "n8n", "cron"]).default("web"),
  eventId: z.string().optional(), // 冪等性キー（n8n再送対策）
});

// 依頼受付 → 分類 → AI選択 → 実行 → コスト記録 → Obsidian保存 → n8n報告
export async function POST(req: Request) {
  const started = Date.now();

  // 外部チャネル（n8n/LINE/音声/cron）は共有シークレット必須。web はアプリ内から
  const body = await req.json().catch(() => null);
  const parsed = IntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { input, source, eventId } = parsed.data;
  if (source !== "web" && !verifyRouterSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 冪等性: 同じ eventId は再実行せず既存結果を返す
  if (eventId) {
    const existing = await prisma.routerRun.findUnique({ where: { sourceEventId: eventId } });
    if (existing) return NextResponse.json({ runId: existing.id, status: existing.status, deduped: true });
  }

  const run = await prisma.routerRun.create({
    data: { input, source, sourceEventId: eventId ?? null, status: "running" },
  });

  try {
    // [1] 分類（Complexity判定）
    const { classification: c, inputTokens: ci, outputTokens: co } = await classify(input);
    const classifyCost = calcCostUsd(MODELS.HAIKU, ci, co);
    await prisma.routerStep.create({
      data: {
        runId: run.id, name: "classify", agent: "Router", model: MODELS.HAIKU,
        status: "done", inputTokens: ci, outputTokens: co, costUsd: classifyCost,
        output: JSON.stringify(c),
      },
    });

    // [2] AI選択（Fableガード: 閾値・日次上限・理由必須）
    const policy = await getPolicy();
    const fableSpent = await fableSpentTodayUsd();
    const decision = decideThinkModel(c, policy, fableSpent);
    const route = decideRoute(c, decision, policy);

    await prisma.routerRun.update({
      where: { id: run.id },
      data: {
        classification: c,
        plan: { route: { ...route }, decision: { ...decision } },
        estimatedUsd: route.estimatedUsd + classifyCost,
      },
    });

    // [3] 実行（Obsidian参照 → モデル呼び出し）
    const stepStarted = Date.now();
    const result = await executeRoute(input, c, route);
    const execCost = calcCostUsd(result.model, result.inputTokens, result.outputTokens);
    await prisma.routerStep.create({
      data: {
        runId: run.id, name: route.step, agent: route.agent, model: result.model,
        status: "done", fableReason: decision.escalated ? decision.reason : null,
        inputTokens: result.inputTokens, outputTokens: result.outputTokens,
        costUsd: execCost, durationMs: Date.now() - stepStarted,
        output: result.output.slice(0, 10000),
      },
    });

    // [4] Obsidian 保存（Company OS へ蓄積）
    const totalCost = classifyCost + execCost;
    const obsidianPath = await saveNoteToVault({
      title: c.title, body: result.output, intent: c.intent, domain: c.domain,
      tags: c.tags, runId: run.id, agent: route.agent, model: result.model,
      costUsd: totalCost, vaultRefs: result.vaultRefs,
    });

    const durationMs = Date.now() - started;
    const summary = [
      `✅ ${c.title}`,
      `担当: ${route.agent} / ${result.model}${decision.downgraded ? "（Fable上限のため降格）" : ""}`,
      `コスト: $${totalCost.toFixed(3)}（見積 $${(route.estimatedUsd + classifyCost).toFixed(3)}）`,
      obsidianPath ? `保存先: ${obsidianPath}` : isVaultConfigured() ? "保存先: 保存失敗" : "保存先: Vault未設定",
    ].join("\n");

    await prisma.routerRun.update({
      where: { id: run.id },
      data: {
        status: "done", resultSummary: summary, durationMs,
        inputTokens: ci + result.inputTokens, outputTokens: co + result.outputTokens,
        costUsd: totalCost, obsidianPath,
      },
    });

    // [5] n8n へ完了報告（→ LINE等）
    await sendReport({
      runId: run.id, status: "done", title: c.title, source,
      agent: route.agent, model: result.model, costUsd: totalCost,
      estimatedUsd: route.estimatedUsd + classifyCost, durationMs, obsidianPath, summary,
    });

    return NextResponse.json({
      runId: run.id,
      status: "done",
      classification: c,
      model: result.model,
      modelDecision: decision.reason,
      output: result.output,
      costUsd: totalCost,
      estimatedUsd: route.estimatedUsd + classifyCost,
      obsidianPath,
      vaultRefs: result.vaultRefs,
      durationMs,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.routerRun.update({
      where: { id: run.id },
      data: { status: "error", error: message, durationMs: Date.now() - started },
    });
    await sendReport({
      runId: run.id, status: "error", title: input.slice(0, 40), source,
      agent: "-", model: "-", costUsd: 0, estimatedUsd: null,
      durationMs: Date.now() - started, obsidianPath: null,
      summary: `❌ 実行エラー: ${message}`,
    });
    return NextResponse.json({ runId: run.id, status: "error", error: message }, { status: 500 });
  }
}
