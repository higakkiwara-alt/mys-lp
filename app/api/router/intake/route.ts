import { NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { classify } from "@/lib/router/classifier";
import { getPolicy } from "@/lib/router/config";
import { decideThinkModel, fableSpentTodayUsd } from "@/lib/router/guard";
import { buildPlan, buildAck } from "@/lib/router/plan";
import { runPipeline } from "@/lib/router/orchestrator";
import { calcCostUsd } from "@/lib/router/pricing";
import { MODELS } from "@/lib/router/models";
import { verifyRouterSecret } from "@/lib/router/notify";

export const maxDuration = 300; // 非同期実行（after）も同一実行時間内で動く

const IntakeSchema = z.object({
  input: z.string().min(1).max(20000), // 依頼（音声は n8n で文字起こし済みテキスト）
  source: z.enum(["voice", "line", "web", "n8n", "cron"]).default("web"),
  eventId: z.string().optional(), // 冪等性キー（n8n再送対策）
  sync: z.boolean().optional(), // true なら完了まで待って結果を返す（テスト・web用）
});

// 受付 → 分類 → 計画 → 即時ACK返却（受付完了/想定処理/使用予定AI/概算コスト/完了時通知）
// 実行は応答後に非同期で継続し、完了時に n8n 経由で LINE Push 報告する
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = IntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { input, source, eventId, sync } = parsed.data;
  if (source !== "web" && !verifyRouterSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 冪等性: 同じ eventId は再実行しない
  if (eventId) {
    const existing = await prisma.routerRun.findUnique({ where: { sourceEventId: eventId } });
    if (existing) {
      return NextResponse.json({
        runId: existing.id,
        status: existing.status,
        output: existing.resultSummary ?? "処理中です。完了時に通知します。",
        deduped: true,
      });
    }
  }

  const run = await prisma.routerRun.create({
    data: { input, source, sourceEventId: eventId ?? null, status: "queued" },
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

    // [2] AI選択 + 実行計画（AI COO: Agent選定・実行順序決定・承認要否）
    const policy = await getPolicy();
    const fableSpent = await fableSpentTodayUsd();
    const decision = decideThinkModel(c, policy, fableSpent);
    const plan = buildPlan(c, decision, policy);

    await prisma.routerRun.update({
      where: { id: run.id },
      data: {
        classification: JSON.parse(JSON.stringify(c)),
        plan: JSON.parse(JSON.stringify(plan)),
        title: c.title,
        estimatedUsd: plan.estimatedUsd,
        inputTokens: ci,
        outputTokens: co,
        costUsd: classifyCost,
      },
    });

    // [3] 実行（同期指定時は待つ / 通常は応答後に非同期実行 → 完了時 LINE Push）
    if (sync) {
      await runPipeline(run.id);
      const finished = await prisma.routerRun.findUnique({
        where: { id: run.id },
        include: { steps: { orderBy: { createdAt: "asc" } } },
      });
      return NextResponse.json({
        runId: run.id,
        status: finished?.status,
        output: finished?.resultSummary ?? "",
        costUsd: Number(finished?.costUsd ?? 0),
        obsidianPath: finished?.obsidianPath,
      });
    }

    after(() => runPipeline(run.id));

    const ack = buildAck(c, plan);
    return NextResponse.json({
      runId: run.id,
      status: "accepted",
      output: ack, // WF-0 はこのフィールドを LINE 返信に使う
      classification: c,
      estimatedUsd: plan.estimatedUsd,
      approvalRequired: plan.approvalRequired,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.routerRun.update({
      where: { id: run.id },
      data: { status: "error", error: message },
    });
    return NextResponse.json(
      { runId: run.id, status: "error", error: message, output: `❌ 受付エラー: ${message}` },
      { status: 500 }
    );
  }
}
