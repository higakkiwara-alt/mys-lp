import { prisma } from "@/lib/db";
import { MODELS, type ModelId } from "./models";
import type { RouterPolicy } from "./config";
import type { Classification } from "./classifier";

// Fable 5 コスト規律（docs/ai-router-os/03 §1）
// - complexity >= 閾値 かつ intent=think のときだけ許可
// - 理由（fable_worthiness）必須 → RouterStep.fableReason に記録（将来のROI自動分析の学習データ）
// - 日次上限超過で Sonnet に自動降格

export type ModelDecision = {
  model: ModelId;
  escalated: boolean; // Fable 5 に昇格したか
  downgraded: boolean; // 上限超過等で降格したか
  reason: string; // 判断根拠（ログ・Dashboard表示用）
};

export async function fableSpentTodayUsd(): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const agg = await prisma.routerStep.aggregate({
    where: { model: MODELS.FABLE, createdAt: { gte: startOfDay } },
    _sum: { costUsd: true },
  });
  return Number(agg._sum.costUsd ?? 0);
}

export function decideThinkModel(
  c: Classification,
  policy: RouterPolicy,
  fableSpentToday: number
): ModelDecision {
  const wantsFable =
    c.intent === "think" &&
    c.complexity >= policy.fableComplexityThreshold &&
    c.fable_worthiness.trim().length > 0;

  if (!wantsFable) {
    return {
      model: MODELS.SONNET,
      escalated: false,
      downgraded: false,
      reason: `complexity=${c.complexity} < 閾値${policy.fableComplexityThreshold} または理由なし → 標準(Sonnet)`,
    };
  }

  if (fableSpentToday >= policy.fableDailyLimitUsd) {
    return {
      model: MODELS.SONNET,
      escalated: false,
      downgraded: true,
      reason: `Fable日次上限($${policy.fableDailyLimitUsd})消化済み($${fableSpentToday.toFixed(2)}) → Sonnetに自動降格`,
    };
  }

  return {
    model: MODELS.FABLE,
    escalated: true,
    downgraded: false,
    reason: `経営判断と判定（complexity=${c.complexity}）: ${c.fable_worthiness}`,
  };
}
