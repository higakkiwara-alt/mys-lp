import { prisma } from "@/lib/db";

// Router の可変ポリシー。初期値は下記、運用後は RouterConfig テーブルの値が優先される。
// Reviewer Agent（Day90）が月間コスト・ROI・使用頻度・成果を分析して自動更新する設計
// （更新時は updatedBy="reviewer-agent" + reason を必ず記録 = 監査可能な自動最適化）
export type RouterPolicy = {
  /** この complexity 以上かつ intent=think のときだけ Fable 5 を許可 */
  fableComplexityThreshold: number;
  /** Fable 5 の日次コスト上限（USD）。超過時は Sonnet に自動降格 */
  fableDailyLimitUsd: number;
  /** 発信系ステップは承認必須（オーナー指示: 承認後投稿がデフォルト） */
  requireApprovalForPublish: boolean;
  /** 推定コストがこの額（USD）を超える実行は承認キューに入れる */
  approvalCostThresholdUsd: number;
  /** 常に文脈に読み込む Vault ノート（会社方針・価値観・売却構想など） */
  pinnedNotes: string[];
  /** SNS 媒体別最適化の対象（write ステップで生成する媒体） */
  snsPlatforms: string[];
  /** 動画WFの日次自動実行上限。超過分は承認待ちに保留（BMU 300本の一括処理防止・パイロット運用） */
  videoDailyLimit: number;
};

export const DEFAULT_POLICY: RouterPolicy = {
  fableComplexityThreshold: 4,
  fableDailyLimitUsd: 10,
  requireApprovalForPublish: true,
  approvalCostThresholdUsd: 2,
  // CEO Principles を全依頼で常時参照（オーナー指示 Day30。/api/router/seed で Vault に作成）
  pinnedNotes: ["Company OS/00_大竹一樹 CEO Principles.md"],
  snsPlatforms: ["Instagram", "LINE", "X"],
  videoDailyLimit: 10,
};

const POLICY_KEY = "policy";

export async function getPolicy(): Promise<RouterPolicy> {
  try {
    const row = await prisma.routerConfig.findUnique({ where: { key: POLICY_KEY } });
    if (!row) return DEFAULT_POLICY;
    return { ...DEFAULT_POLICY, ...(row.value as Partial<RouterPolicy>) };
  } catch {
    // DB未接続でも既定値で動作（設定はベストエフォート）
    return DEFAULT_POLICY;
  }
}

export async function updatePolicy(
  patch: Partial<RouterPolicy>,
  updatedBy: "owner" | "reviewer-agent" | "system",
  reason: string
): Promise<RouterPolicy> {
  const current = await getPolicy();
  const next = { ...current, ...patch };
  await prisma.routerConfig.upsert({
    where: { key: POLICY_KEY },
    create: { key: POLICY_KEY, value: next, updatedBy, reason },
    update: { value: next, updatedBy, reason },
  });
  return next;
}
