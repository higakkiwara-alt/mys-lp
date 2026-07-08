import { describe, it, expect } from "vitest";
import { PROMPT_LIBRARY } from "@/prompts/library";
import { selectPrompt } from "@/lib/router/prompt-library";
import { buildPlan } from "@/lib/router/plan";
import { DEFAULT_POLICY } from "@/lib/router/config";
import { decideThinkModel } from "@/lib/router/guard";
import type { Classification } from "@/lib/router/classifier";

const base: Classification = {
  intent: "knowledge", domain: "美容室", output_type: "Obsidianノート", complexity: 2,
  urgency: "today", needs_approval: false, fable_worthiness: "",
  title: "音声メモ", tags: ["会議"],
};

describe("プロンプトライブラリ（30本）", () => {
  it("10カテゴリ×3本の30本が定義されている", () => {
    expect(PROMPT_LIBRARY).toHaveLength(30);
    const categories = new Set(PROMPT_LIBRARY.map((p) => p.category));
    expect(categories.size).toBe(10);
    for (const cat of [
      "経営判断", "スタッフ対応", "クレーム対応", "採用", "教育",
      "SNS", "不成約分析", "売却・M&A", "税務/法務", "n8n/Obsidian自動化",
    ]) {
      expect(PROMPT_LIBRARY.filter((p) => p.category === cat)).toHaveLength(3);
    }
  });
  it("id が一意である", () => {
    const ids = PROMPT_LIBRARY.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("クレーム依頼にはクレーム系プロンプトが選ばれる", () => {
    const c: Classification = {
      ...base, intent: "create_text", domain: "美容室",
      title: "クレーム返信", tags: ["クレーム", "顧客対応"], needs_approval: true,
    };
    const p = selectPrompt(c, "縮毛矯正のクレームに返信文を作って");
    expect(p).not.toBeNull();
    expect(p!.category).toBe("クレーム対応");
  });
  it("売却相談には売却・M&A プロンプトが選ばれる", () => {
    const c: Classification = {
      ...base, intent: "think", domain: "経営",
      title: "企業価値向上", tags: ["売却", "M&A"],
    };
    const p = selectPrompt(c, "会社売却に向けた企業価値向上の施策を整理して");
    expect(p).not.toBeNull();
    expect(p!.category).toBe("売却・M&A");
  });
  it("適合度が低い依頼にはプロンプトを強制しない", () => {
    const c: Classification = {
      ...base, intent: "manage", domain: "その他", title: "雑務", tags: [],
    };
    const p = selectPrompt(c, "今日の天気どう?");
    expect(p).toBeNull();
  });
});

describe("音声→知識化パイプライン（Day30）", () => {
  it("音声ソースの knowledge は 要約→タスク化 の2段パイプラインになる", () => {
    const decision = decideThinkModel(base, DEFAULT_POLICY, 0);
    const plan = buildPlan(base, decision, DEFAULT_POLICY, "voice");
    expect(plan.steps.map((s) => s.name)).toEqual(["knowledge", "tasks"]);
    expect(plan.steps[0].agent).toBe("Knowledge");
    expect(plan.steps[1].agent).toBe("COO");
  });
  it("同じ依頼でも web ソースなら単発実行のまま", () => {
    const decision = decideThinkModel(base, DEFAULT_POLICY, 0);
    const plan = buildPlan(base, decision, DEFAULT_POLICY, "web");
    expect(plan.steps.map((s) => s.name)).toEqual(["knowledge"]);
  });
  it("音声でもSNS告知は SNSパイプライン優先", () => {
    const c: Classification = {
      ...base, intent: "create_text", domain: "SNS", needs_approval: true,
      title: "新メニュー告知", tags: ["SNS", "告知"],
    };
    const decision = decideThinkModel(c, DEFAULT_POLICY, 0);
    const plan = buildPlan(c, decision, DEFAULT_POLICY, "voice");
    expect(plan.steps.some((s) => s.kind === "publish")).toBe(true);
    expect(plan.steps.some((s) => s.kind === "approval")).toBe(true);
  });
});

describe("ピン留めノート設定", () => {
  it("CEO Principles が既定のピン留めノートに設定されている", () => {
    expect(DEFAULT_POLICY.pinnedNotes).toContain("Company OS/00_大竹一樹 CEO Principles.md");
  });
});
