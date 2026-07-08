import { describe, it, expect } from "vitest";
import { calcCostUsd, estimateCostUsd, PRICING } from "@/lib/router/pricing";
import { MODELS } from "@/lib/router/models";
import { decideThinkModel } from "@/lib/router/guard";
import { decideRoute } from "@/lib/router/routes";
import { DEFAULT_POLICY } from "@/lib/router/config";
import { vaultFolderFor } from "@/lib/obsidian/vault";
import type { Classification } from "@/lib/router/classifier";

const base: Classification = {
  intent: "think",
  domain: "経営",
  output_type: "回答",
  complexity: 4,
  urgency: "today",
  needs_approval: false,
  fable_worthiness: "出店判断は資金・雇用に長期影響する",
  title: "2号店出店の判断",
  tags: ["経営", "出店"],
};

describe("pricing", () => {
  it("Fable 5 のコストを正しく計算する", () => {
    // 30K入力 + 10K出力 = 30K*$10/M + 10K*$50/M = $0.3 + $0.5 = $0.8
    expect(calcCostUsd(MODELS.FABLE, 30_000, 10_000)).toBeCloseTo(0.8, 6);
  });
  it("全モデルに価格が定義されている", () => {
    for (const model of Object.values(MODELS)) {
      expect(PRICING[model].inputPerM).toBeGreaterThan(0);
      expect(PRICING[model].outputPerM).toBeGreaterThan(0);
    }
  });
  it("推定コストが正の値を返す", () => {
    expect(estimateCostUsd("think_deep", MODELS.FABLE)).toBeGreaterThan(0);
    expect(estimateCostUsd("unknown_kind", MODELS.SONNET)).toBeGreaterThan(0);
  });
});

describe("Fable ガード（コスト規律）", () => {
  it("complexity>=4 の経営判断は Fable 5 に昇格する", () => {
    const d = decideThinkModel(base, DEFAULT_POLICY, 0);
    expect(d.model).toBe(MODELS.FABLE);
    expect(d.escalated).toBe(true);
    expect(d.reason).toContain("出店");
  });
  it("complexity が閾値未満なら Sonnet", () => {
    const d = decideThinkModel({ ...base, complexity: 3 }, DEFAULT_POLICY, 0);
    expect(d.model).toBe(MODELS.SONNET);
    expect(d.escalated).toBe(false);
  });
  it("理由（fable_worthiness）がなければ昇格しない", () => {
    const d = decideThinkModel({ ...base, fable_worthiness: "" }, DEFAULT_POLICY, 0);
    expect(d.model).toBe(MODELS.SONNET);
  });
  it("日次上限を消化していたら Sonnet に自動降格する", () => {
    const d = decideThinkModel(base, DEFAULT_POLICY, DEFAULT_POLICY.fableDailyLimitUsd);
    expect(d.model).toBe(MODELS.SONNET);
    expect(d.downgraded).toBe(true);
  });
  it("閾値はポリシーで変更できる（自動最適化の前提）", () => {
    const d = decideThinkModel(
      { ...base, complexity: 3 },
      { ...DEFAULT_POLICY, fableComplexityThreshold: 3 },
      0
    );
    expect(d.model).toBe(MODELS.FABLE);
  });
});

describe("ルーティングテーブル", () => {
  const sonnetDecision = { model: MODELS.SONNET, escalated: false, downgraded: false, reason: "" } as const;

  it("think は決定されたモデルを使う", () => {
    const fable = { model: MODELS.FABLE, escalated: true, downgraded: false, reason: "" } as const;
    expect(decideRoute(base, fable, DEFAULT_POLICY).model).toBe(MODELS.FABLE);
    expect(decideRoute(base, fable, DEFAULT_POLICY).agent).toBe("CEO");
  });
  it("大量文章生成は Sonnet（SNSドメインは SNS Agent）", () => {
    const r = decideRoute({ ...base, intent: "create_text", domain: "SNS" }, sonnetDecision, DEFAULT_POLICY);
    expect(r.model).toBe(MODELS.SONNET);
    expect(r.agent).toBe("SNS");
  });
  it("検索は web_search ツール付き", () => {
    const r = decideRoute({ ...base, intent: "search" }, sonnetDecision, DEFAULT_POLICY);
    expect(r.useWebSearch).toBe(true);
  });
  it("コード生成は CTO 経由の handoff（Claude Code へ）", () => {
    const r = decideRoute({ ...base, intent: "create_code" }, sonnetDecision, DEFAULT_POLICY);
    expect(r.kind).toBe("handoff");
    expect(r.agent).toBe("CTO");
  });
  it("すべての intent が推定コストを持つ", () => {
    const intents = [
      "think", "create_text", "create_code", "create_image", "create_video",
      "search", "data", "automation", "knowledge", "manage",
    ] as const;
    for (const intent of intents) {
      const r = decideRoute({ ...base, intent }, sonnetDecision, DEFAULT_POLICY);
      expect(r.estimatedUsd).toBeGreaterThan(0);
    }
  });
});

describe("Obsidian 自動分類", () => {
  it("経営判断は Company OS/経営判断 に保存される", () => {
    expect(vaultFolderFor("think", "経営")).toBe("Company OS/経営判断");
    expect(vaultFolderFor("think", "財務")).toBe("Company OS/経営判断");
  });
  it("SNS は Projects/SNS、その他は受信箱", () => {
    expect(vaultFolderFor("create_text", "SNS")).toBe("Projects/SNS");
    expect(vaultFolderFor("create_text", "その他")).toBe("Knowledge/受信箱");
  });
});
