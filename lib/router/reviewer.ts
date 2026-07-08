import { prisma } from "@/lib/db";
import { callAgent } from "./executor";
import { MODELS } from "./models";
import { calcCostUsd } from "./pricing";
import { putVaultFile } from "@/lib/obsidian/vault";
import { sendReport } from "./notify";
import { getPolicy } from "./config";

// Reviewer Agent（Day90 優先順位①）
// 直近7日の実行ログを 判断品質・コスト・スピード・再実行回数・成功率 で評価し、
// 「今週の改善提案」を自動生成 → Obsidian(Logs/) 保存 + Dashboard 表示 + LINE 報告。
// ポリシー変更（Fable閾値等）は「提案」まで。適用は人間が最終判断する（Day90 原則）。

export type WeeklyStats = {
  period: { from: string; to: string };
  runs: {
    total: number;
    done: number;
    error: number;
    rejected: number;
    successRate: number; // done / (total - 実行中)
  };
  cost: {
    totalUsd: number;
    byModel: Array<{ model: string; calls: number; costUsd: number }>;
    estimateAccuracy: number | null; // 実測/見積 の中央値
  };
  speed: {
    avgDurationMs: number | null;
    maxDurationMs: number | null;
    avgApprovalWaitMs: number | null; // 承認待ち滞留
  };
  reliability: {
    qaRedoCount: number; // QA不合格→再生成の回数
    ownerRejectCount: number; // オーナー却下（修正指示）の回数
    stepErrorCount: number;
  };
  fable: {
    calls: number;
    costUsd: number;
    reasons: string[]; // 使用理由（判断品質評価の材料）
  };
  prompts: Array<{ promptId: string; count: number }>;
};

export async function collectWeeklyStats(): Promise<WeeklyStats> {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);

  const runs = await prisma.routerRun.findMany({
    where: { createdAt: { gte: from } },
    select: {
      status: true, costUsd: true, estimatedUsd: true, durationMs: true,
      approvedAt: true, createdAt: true, feedback: true, plan: true,
    },
  });
  const steps = await prisma.routerStep.findMany({
    where: { createdAt: { gte: from } },
    select: { name: true, model: true, status: true, costUsd: true, fableReason: true },
  });

  const done = runs.filter((r) => r.status === "done").length;
  const error = runs.filter((r) => r.status === "error").length;
  const rejected = runs.filter((r) => r.status === "rejected").length;
  const finished = done + error + rejected;

  const byModelMap = new Map<string, { calls: number; costUsd: number }>();
  for (const s of steps) {
    if (!s.model) continue;
    const cur = byModelMap.get(s.model) ?? { calls: 0, costUsd: 0 };
    cur.calls++;
    cur.costUsd += Number(s.costUsd);
    byModelMap.set(s.model, cur);
  }

  const ratios = runs
    .filter((r) => r.status === "done" && r.estimatedUsd && Number(r.estimatedUsd) > 0)
    .map((r) => Number(r.costUsd) / Number(r.estimatedUsd))
    .sort((a, b) => a - b);
  const durations = runs.filter((r) => r.durationMs != null).map((r) => r.durationMs!);
  const approvalWaits = runs
    .filter((r) => r.approvedAt)
    .map((r) => r.approvedAt!.getTime() - r.createdAt.getTime());

  const fableSteps = steps.filter((s) => s.model === MODELS.FABLE || s.model === MODELS.OPUS);
  const promptCounts = new Map<string, number>();
  for (const r of runs) {
    const pid = (r.plan as { promptId?: string } | null)?.promptId;
    if (pid) promptCounts.set(pid, (promptCounts.get(pid) ?? 0) + 1);
  }

  return {
    period: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
    runs: {
      total: runs.length, done, error, rejected,
      successRate: finished ? done / finished : 1,
    },
    cost: {
      totalUsd: runs.reduce((a, r) => a + Number(r.costUsd), 0),
      byModel: [...byModelMap.entries()].map(([model, v]) => ({ model, ...v })),
      estimateAccuracy: ratios.length ? ratios[Math.floor(ratios.length / 2)] : null,
    },
    speed: {
      avgDurationMs: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
      maxDurationMs: durations.length ? Math.max(...durations) : null,
      avgApprovalWaitMs: approvalWaits.length
        ? approvalWaits.reduce((a, b) => a + b, 0) / approvalWaits.length
        : null,
    },
    reliability: {
      qaRedoCount: steps.filter((s) => s.name.includes("(QA修正)")).length,
      ownerRejectCount: runs.filter((r) => r.feedback).length,
      stepErrorCount: steps.filter((s) => s.status === "error").length,
    },
    fable: {
      calls: fableSteps.length,
      costUsd: fableSteps.reduce((a, s) => a + Number(s.costUsd), 0),
      reasons: steps.filter((s) => s.fableReason).map((s) => s.fableReason!).slice(0, 10),
    },
    prompts: [...promptCounts.entries()].map(([promptId, count]) => ({ promptId, count })),
  };
}

/** 今週の改善提案を生成し、Obsidian 保存 + RouterConfig(Dashboard表示用) + LINE 報告 */
export async function generateWeeklyReview(): Promise<{ report: string; stats: WeeklyStats }> {
  const stats = await collectWeeklyStats();
  const policy = await getPolicy();

  const res = await callAgent({
    agent: "COO",
    model: MODELS.SONNET,
    maxTokens: 4096,
    prompt: `あなたは AI Router OS の Reviewer Agent。直近7日の実行統計から「今週の改善提案」を作成してください。

【実行統計】
${JSON.stringify(stats, null, 2)}

【現在のポリシー】
${JSON.stringify(policy, null, 2)}

構成（Markdown）:
# 今週の改善提案（${stats.period.from}〜${stats.period.to}）
## サマリー（3行）
## 評価
- 判断品質: Fableの使用理由は妥当だったか。オーナー却下・QA不合格の傾向から品質課題を指摘
- コスト: モデル別内訳の妥当性。見積精度（estimateAccuracy が 0.7〜1.3 の外なら見積テーブルの補正を提案）
- スピード: 平均/最大実行時間、承認待ち滞留のボトルネック
- 信頼性: 再実行回数（QA修正・却下・ステップエラー）の傾向と根本原因の仮説
- 成功率: ${(stats.runs.successRate * 100).toFixed(0)}% の評価
## 改善提案（優先順位つき3〜5件。各: 提案/根拠となる数字/期待効果）
## ポリシー変更の提案（あれば。※適用はオーナーの承認が必要と明記）

データが少ない場合は無理に問題を作らず「データ不足。来週も蓄積を継続」と正直に書く。`,
  });

  const reviewCost = calcCostUsd(res.model, res.inputTokens, res.outputTokens);
  const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });

  // Obsidian(Logs/) へ保存
  await putVaultFile(
    `Logs/週次レビュー/${date} 今週の改善提案.md`,
    `---\ntype: weekly-review\ndate: ${date}\ntags: [Reviewer, 改善提案]\ncost_usd: ${reviewCost.toFixed(4)}\n---\n\n${res.output}\n`,
    `Reviewer: 週次改善提案 ${date}`
  );

  // Dashboard 表示用に保存
  await prisma.routerConfig.upsert({
    where: { key: "weeklyReview" },
    create: {
      key: "weeklyReview",
      value: { date, report: res.output, stats: JSON.parse(JSON.stringify(stats)) },
      updatedBy: "reviewer-agent",
      reason: "週次自動生成",
    },
    update: {
      value: { date, report: res.output, stats: JSON.parse(JSON.stringify(stats)) },
      updatedBy: "reviewer-agent",
      reason: "週次自動生成",
    },
  });

  // LINE 報告
  await sendReport({
    runId: "weekly-review",
    status: "done",
    title: "今週の改善提案",
    source: "cron",
    agent: "Reviewer",
    model: res.model,
    costUsd: reviewCost,
    estimatedUsd: null,
    durationMs: 0,
    obsidianPath: `Logs/週次レビュー/${date} 今週の改善提案.md`,
    summary: `📊 今週の改善提案が届きました\n\n${res.output.slice(0, 3000)}`,
  });

  return { report: res.output, stats };
}
