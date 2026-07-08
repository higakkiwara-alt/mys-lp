// モデルID・役割の一元管理（ハードコード禁止。変更はここだけ）
// 価格は pricing.ts、使用条件（Fable規律）は guard.ts / config.ts を参照

export const MODELS = {
  /** 経営判断・戦略・深い思考・壁打ち。Router の許可制（guard.ts） */
  FABLE: "claude-fable-5",
  /** Fable の refusal フォールバック先 / 高度なコードレビュー */
  OPUS: "claude-opus-4-8",
  /** 標準。文章生成・分析・各Agentの既定 */
  SONNET: "claude-sonnet-5",
  /** 分類・要約・整形・report */
  HAIKU: "claude-haiku-4-5",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

export const MODEL_LABEL: Record<ModelId, string> = {
  [MODELS.FABLE]: "Fable 5（経営判断）",
  [MODELS.OPUS]: "Opus 4.8",
  [MODELS.SONNET]: "Sonnet 5（標準）",
  [MODELS.HAIKU]: "Haiku 4.5（分類）",
};
