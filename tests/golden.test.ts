import { describe, it, expect } from "vitest";
import { GOLDEN_CASES } from "./fixtures/golden-cases";
import { DEFAULT_POLICY } from "@/lib/router/config";
import { decideThinkModel } from "@/lib/router/guard";
import { buildPlan, buildAck } from "@/lib/router/plan";
import { MODELS } from "@/lib/router/models";
import { vaultFolderFor } from "@/lib/obsidian/vault";
import { classify } from "@/lib/router/classifier";

// ゴールデンケース20件の回帰テスト
// レイヤー1（常時実行）: 期待分類 → ルーティング・承認・保存先が仕様通りか
// レイヤー2（ANTHROPIC_API_KEY があるときのみ）: 実分類が期待と一致するか

const TIER_MODEL = { fable: MODELS.FABLE, sonnet: MODELS.SONNET, haiku: MODELS.HAIKU } as const;

describe("ゴールデンケース: ルーティング回帰（20件）", () => {
  for (const gc of GOLDEN_CASES) {
    it(`${gc.id}: ${gc.label}`, () => {
      const decision = decideThinkModel(gc.classification, DEFAULT_POLICY, 0);
      const plan = buildPlan(gc.classification, decision, DEFAULT_POLICY);

      // モデル階層（Fableは許可制）
      const llmModels = plan.steps.filter((s) => s.kind === "llm").map((s) => s.model);
      if (gc.expect.modelTier === "fable") {
        expect(llmModels).toContain(TIER_MODEL.fable);
      } else {
        expect(llmModels).not.toContain(TIER_MODEL.fable);
      }

      // 承認キュー（SNS投稿・外部送信・重要判断・高コストは必ず承認）
      expect(plan.approvalRequired).toBe(gc.expect.approvalRequired);
      if (gc.expect.approvalRequired) {
        expect(plan.steps.some((s) => s.kind === "approval")).toBe(true);
        // 承認前に publish が来ないこと（勝手に投稿しない）
        const approvalIdx = plan.steps.findIndex((s) => s.kind === "approval");
        const publishIdx = plan.steps.findIndex((s) => s.kind === "publish");
        if (publishIdx >= 0) expect(publishIdx).toBeGreaterThan(approvalIdx);
      }

      // publish ステップの有無
      if (gc.expect.hasPublishStep !== undefined) {
        expect(plan.steps.some((s) => s.kind === "publish")).toBe(gc.expect.hasPublishStep);
      }

      // 担当Agent
      if (gc.expect.agent) {
        expect(plan.steps.map((s) => s.agent)).toContain(gc.expect.agent);
      }

      // Obsidian 保存先（オーナー指定マッピング）
      expect(
        vaultFolderFor(gc.classification.intent, gc.classification.domain, gc.classification.tags)
      ).toBe(gc.expect.folder);

      // ACK が必須項目を含む（受付完了/使用予定AI/概算コスト/完了時通知）
      const ack = buildAck(gc.classification, plan);
      expect(ack).toContain("受付完了");
      expect(ack).toContain("使用予定AI");
      expect(ack).toContain("概算コスト");
      expect(ack).toContain("完了時に通知");
    });
  }
});

describe.skipIf(!process.env.ANTHROPIC_API_KEY)("ゴールデンケース: 実分類（API必要）", () => {
  for (const gc of GOLDEN_CASES) {
    it(`${gc.id}: ${gc.label}`, { timeout: 30000 }, async () => {
      const { classification: c } = await classify(gc.input);
      expect(c.intent).toBe(gc.classification.intent);
      expect(c.domain).toBe(gc.classification.domain);
      // complexity は ±1 の揺れを許容
      expect(Math.abs(c.complexity - gc.classification.complexity)).toBeLessThanOrEqual(1);
      expect(c.needs_approval).toBe(gc.classification.needs_approval);
    });
  }
});
