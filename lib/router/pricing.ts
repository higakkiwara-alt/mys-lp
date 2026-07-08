import { MODELS, type ModelId } from "./models";

// USD per 1M tokens（価格改定時はここだけ直す）
// 参照: docs/ai-router-os/03-cost-optimization.md
export const PRICING: Record<ModelId, { inputPerM: number; outputPerM: number }> = {
  [MODELS.FABLE]: { inputPerM: 10, outputPerM: 50 },
  [MODELS.OPUS]: { inputPerM: 5, outputPerM: 25 },
  // intro価格($2/$10)は2026-08-31まで。保守的に定価で計上する
  [MODELS.SONNET]: { inputPerM: 3, outputPerM: 15 },
  [MODELS.HAIKU]: { inputPerM: 1, outputPerM: 5 },
};

export function calcCostUsd(model: ModelId, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model];
  return (inputTokens * p.inputPerM + outputTokens * p.outputPerM) / 1_000_000;
}

// 実行前の推定コスト（代表トークン量からの概算。Dashboard/intake応答で提示）
const TYPICAL_TOKENS: Record<string, { input: number; output: number }> = {
  classify: { input: 1_500, output: 300 },
  think_deep: { input: 30_000, output: 10_000 }, // Fable想定
  think: { input: 6_000, output: 3_000 },
  create_text: { input: 4_000, output: 6_000 },
  search: { input: 8_000, output: 3_000 },
  knowledge: { input: 6_000, output: 2_000 },
  default: { input: 4_000, output: 2_000 },
};

export function estimateCostUsd(stepKind: string, model: ModelId): number {
  const t = TYPICAL_TOKENS[stepKind] ?? TYPICAL_TOKENS.default;
  return calcCostUsd(model, t.input, t.output);
}
