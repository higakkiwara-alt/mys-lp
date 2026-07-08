import { prisma } from "@/lib/db";
import { MODELS } from "./models";

// 実運用レポート（次回レビューでオーナーが見たい項目をワンコマンド出力）:
// 処理件数 / 承認率 / 差し戻し率 / 平均コスト / Fable使用回数 / RAG参照の状況 /
// CEO Memory の蓄積状況 / エラー内容 — Day180 判断の材料

export type OpsReport = {
  period: { from: string; to: string; days: number };
  volume: {
    total: number;
    bySource: Record<string, number>;
    byStatus: Record<string, number>;
  };
  approval: {
    approvalRequiredRuns: number;
    approved: number;
    approvalRate: number | null; // 承認率
    reworked: number; // 差し戻し（修正指示つき却下）
    reworkRate: number | null; // 差し戻し率
    avgWaitMinutes: number | null; // 承認待ち平均滞留
  };
  cost: {
    totalUsd: number;
    avgPerRunUsd: number | null;
    byModel: Array<{ model: string; calls: number; costUsd: number }>;
    fable: { calls: number; costUsd: number; reasons: string[] };
    estimateAccuracyMedian: number | null;
  };
  rag: {
    runsWithRefs: number;
    refRate: number | null; // 参照が付いた実行の割合
    methodBreakdown: Record<string, number>; // rag / search / none
    topReferencedNotes: Array<{ path: string; count: number }>;
  };
  ceoMemory: {
    total: number;
    withOutcome: number;
    outcomeRate: number | null;
    recent: Array<{ title: string; decision: string; hasOutcome: boolean }>;
  };
  errors: Array<{ message: string; count: number }>;
};

export async function collectOpsReport(days = 30): Promise<OpsReport> {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  const runs = await prisma.routerRun.findMany({
    where: { createdAt: { gte: from } },
    select: {
      source: true, status: true, costUsd: true, estimatedUsd: true,
      approvedAt: true, createdAt: true, feedback: true, plan: true,
      vaultRefs: true, retrievalMethod: true, error: true,
    },
  });
  const steps = await prisma.routerStep.findMany({
    where: { createdAt: { gte: from }, model: { not: null } },
    select: { model: true, costUsd: true, fableReason: true },
  });
  const memories = await prisma.ceoMemory.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const bySource: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const r of runs) {
    bySource[r.source] = (bySource[r.source] ?? 0) + 1;
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  }

  const approvalRuns = runs.filter((r) => (r.plan as { approvalRequired?: boolean } | null)?.approvalRequired);
  const approved = approvalRuns.filter((r) => r.approvedAt).length;
  const reworked = runs.filter((r) => r.feedback).length;
  const waits = approvalRuns
    .filter((r) => r.approvedAt)
    .map((r) => (r.approvedAt!.getTime() - r.createdAt.getTime()) / 60000);

  const byModelMap = new Map<string, { calls: number; costUsd: number }>();
  for (const s of steps) {
    const cur = byModelMap.get(s.model!) ?? { calls: 0, costUsd: 0 };
    cur.calls++;
    cur.costUsd += Number(s.costUsd);
    byModelMap.set(s.model!, cur);
  }
  const fableSteps = steps.filter((s) => s.model === MODELS.FABLE);
  const ratios = runs
    .filter((r) => r.status === "done" && r.estimatedUsd && Number(r.estimatedUsd) > 0)
    .map((r) => Number(r.costUsd) / Number(r.estimatedUsd))
    .sort((a, b) => a - b);

  const refCount = new Map<string, number>();
  const methodBreakdown: Record<string, number> = {};
  let runsWithRefs = 0;
  for (const r of runs) {
    if (r.retrievalMethod) methodBreakdown[r.retrievalMethod] = (methodBreakdown[r.retrievalMethod] ?? 0) + 1;
    if (r.vaultRefs.length) runsWithRefs++;
    for (const ref of r.vaultRefs) refCount.set(ref, (refCount.get(ref) ?? 0) + 1);
  }

  const errCount = new Map<string, number>();
  for (const r of runs) {
    if (r.error) {
      const key = r.error.slice(0, 120);
      errCount.set(key, (errCount.get(key) ?? 0) + 1);
    }
  }

  const executed = runs.filter((r) => r.status !== "rejected");

  return {
    period: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), days },
    volume: { total: runs.length, bySource, byStatus },
    approval: {
      approvalRequiredRuns: approvalRuns.length,
      approved,
      approvalRate: approvalRuns.length ? approved / approvalRuns.length : null,
      reworked,
      reworkRate: approvalRuns.length ? reworked / approvalRuns.length : null,
      avgWaitMinutes: waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : null,
    },
    cost: {
      totalUsd: runs.reduce((a, r) => a + Number(r.costUsd), 0),
      avgPerRunUsd: executed.length
        ? runs.reduce((a, r) => a + Number(r.costUsd), 0) / executed.length
        : null,
      byModel: [...byModelMap.entries()].map(([model, v]) => ({ model, ...v })),
      fable: {
        calls: fableSteps.length,
        costUsd: fableSteps.reduce((a, s) => a + Number(s.costUsd), 0),
        reasons: fableSteps.filter((s) => s.fableReason).map((s) => s.fableReason!).slice(0, 10),
      },
      estimateAccuracyMedian: ratios.length ? ratios[Math.floor(ratios.length / 2)] : null,
    },
    rag: {
      runsWithRefs,
      refRate: runs.length ? runsWithRefs / runs.length : null,
      methodBreakdown,
      topReferencedNotes: [...refCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([path, count]) => ({ path, count })),
    },
    ceoMemory: {
      total: memories.length,
      withOutcome: memories.filter((m) => m.outcome).length,
      outcomeRate: memories.length ? memories.filter((m) => m.outcome).length / memories.length : null,
      recent: memories.slice(0, 5).map((m) => ({
        title: m.title,
        decision: m.decision.slice(0, 80),
        hasOutcome: !!m.outcome,
      })),
    },
    errors: [...errCount.entries()].map(([message, count]) => ({ message, count })),
  };
}

const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toFixed(0)}%`);

/** 次回レビュー用の Markdown レポート */
export function formatOpsReport(r: OpsReport): string {
  return [
    `# 実運用レポート（${r.period.from} 〜 ${r.period.to}）`,
    ``,
    `## 処理件数`,
    `- 合計: ${r.volume.total} 件`,
    `- 入口別: ${Object.entries(r.volume.bySource).map(([k, v]) => `${k}:${v}`).join(" / ") || "—"}`,
    `- 状態別: ${Object.entries(r.volume.byStatus).map(([k, v]) => `${k}:${v}`).join(" / ") || "—"}`,
    ``,
    `## 承認フロー`,
    `- 承認対象: ${r.approval.approvalRequiredRuns} 件 / 承認率: ${pct(r.approval.approvalRate)}`,
    `- 差し戻し（修正指示）: ${r.approval.reworked} 件（差し戻し率 ${pct(r.approval.reworkRate)}）`,
    `- 承認待ち平均滞留: ${r.approval.avgWaitMinutes ? `${r.approval.avgWaitMinutes.toFixed(0)} 分` : "—"}`,
    ``,
    `## コスト`,
    `- 合計: $${r.cost.totalUsd.toFixed(2)} / 平均: ${r.cost.avgPerRunUsd ? `$${r.cost.avgPerRunUsd.toFixed(3)}/件` : "—"}`,
    `- モデル別: ${r.cost.byModel.map((m) => `${m.model}×${m.calls}($${m.costUsd.toFixed(2)})`).join(" / ") || "—"}`,
    `- Fable使用: ${r.cost.fable.calls} 回（$${r.cost.fable.costUsd.toFixed(2)}）`,
    `- 見積精度（実測/見積の中央値）: ${r.cost.estimateAccuracyMedian?.toFixed(2) ?? "—"}`,
    ``,
    `## RAG 参照`,
    `- 参照つき実行: ${r.rag.runsWithRefs} 件（${pct(r.rag.refRate)}） / 方式: ${Object.entries(r.rag.methodBreakdown).map(([k, v]) => `${k}:${v}`).join(" / ") || "—"}`,
    `- よく参照されたノート:`,
    ...(r.rag.topReferencedNotes.length
      ? r.rag.topReferencedNotes.map((n) => `  - ${n.path}（${n.count}回）`)
      : ["  - まだなし"]),
    ``,
    `## CEO Memory`,
    `- 判断記録: ${r.ceoMemory.total} 件 / 結果記録済み: ${r.ceoMemory.withOutcome} 件（${pct(r.ceoMemory.outcomeRate)}）`,
    ...(r.ceoMemory.recent.map((m) => `  - ${m.title}: ${m.decision}${m.hasOutcome ? " ✅結果あり" : ""}`)),
    ``,
    `## エラー`,
    ...(r.errors.length ? r.errors.map((e) => `- (${e.count}回) ${e.message}`) : ["- なし"]),
  ].join("\n");
}
