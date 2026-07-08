import { describe, it, expect } from "vitest";
import { tierWeightFor } from "@/lib/obsidian/rag";
import { buildPlan } from "@/lib/router/plan";
import { DEFAULT_POLICY } from "@/lib/router/config";
import { decideThinkModel } from "@/lib/router/guard";
import { MODELS } from "@/lib/router/models";
import type { Classification } from "@/lib/router/classifier";

const base: Classification = {
  intent: "think", domain: "営業", output_type: "文書", complexity: 3,
  urgency: "this_week", needs_approval: false, fable_worthiness: "",
  title: "商談分析", tags: ["商談", "不成約"],
};

describe("RAG 優先順位（オーナー指定の検索順）", () => {
  it("CEO Principles → 会社方針/店舗ルール → 過去の判断 → Meeting → Knowledge → Prompt → Archive の順で重い", () => {
    const order = [
      tierWeightFor("Company OS/00_大竹一樹 CEO Principles.md"),
      tierWeightFor("Company OS/会社方針.md"),
      tierWeightFor("Company OS/経営判断/2026-07 出店判断.md"),
      tierWeightFor("Meetings/2026-07 店舗MTG.md"),
      tierWeightFor("Knowledge/酸性ストレート.md"),
      tierWeightFor("Prompts/SNS/Instagram投稿.md"),
      tierWeightFor("Archive/2024 旧メニュー.md"),
    ];
    for (let i = 1; i < order.length; i++) {
      expect(order[i]).toBeLessThanOrEqual(order[i - 1]);
    }
    expect(order[0]).toBeGreaterThan(order[order.length - 1]);
  });
  it("店舗ルール（店舗運営）は Meeting より優先", () => {
    expect(tierWeightFor("Company OS/店舗運営/ルール.md")).toBeGreaterThan(tierWeightFor("Meetings/x.md"));
  });
});

describe("不成約分析WF（Day90④ SalesAnalyst 専用Agent）", () => {
  it("商談・不成約の依頼は 分析→改善→ロールプレイ の3段パイプライン", () => {
    const decision = decideThinkModel(base, DEFAULT_POLICY, 0);
    const plan = buildPlan(base, decision, DEFAULT_POLICY, "web");
    expect(plan.steps.filter((s) => s.kind === "llm").map((s) => s.name)).toEqual([
      "analyze", "improve", "roleplay",
    ]);
    expect(plan.steps.every((s) => s.kind !== "llm" || s.agent === "SalesAnalyst")).toBe(true);
  });
  it("経営レベルの不成約分析は analyze ステップだけ Fable に昇格する", () => {
    const c: Classification = {
      ...base, domain: "経営", complexity: 4,
      fable_worthiness: "売上に直結する構造分析のため",
    };
    const decision = decideThinkModel(c, DEFAULT_POLICY, 0);
    const plan = buildPlan(c, decision, DEFAULT_POLICY, "web");
    const analyze = plan.steps.find((s) => s.name === "analyze");
    expect(analyze?.model).toBe(MODELS.FABLE);
    const others = plan.steps.filter((s) => s.kind === "llm" && s.name !== "analyze");
    expect(others.every((s) => s.model === MODELS.SONNET)).toBe(true);
  });
});

describe("動画ワークフロー（Day90③）", () => {
  it("source=video は 知識化→教材→SNS→Shorts→YouTube→QA の一本化パイプライン", () => {
    const c: Classification = {
      ...base, intent: "knowledge", domain: "教育", tags: ["動画"],
      title: "BMU動画#152", fable_worthiness: "",
    };
    const decision = decideThinkModel(c, DEFAULT_POLICY, 0);
    const plan = buildPlan(c, decision, DEFAULT_POLICY, "video");
    expect(plan.steps.map((s) => s.name)).toEqual([
      "knowledge", "material", "write", "shorts", "youtube", "qa",
    ]);
    // 自動投稿は含まれない（Day90 禁止リスト）
    expect(plan.steps.some((s) => s.kind === "publish")).toBe(false);
  });
});

describe("口コミ・クレームAgent（Day90⑤）", () => {
  it("口コミ依頼は 返信案→改善案→教育化→QA→承認 のパイプライン", () => {
    const c: Classification = {
      ...base, intent: "create_text", domain: "美容室", needs_approval: true,
      title: "星2口コミへの返信", tags: ["口コミ", "MEO"],
    };
    const decision = decideThinkModel(c, DEFAULT_POLICY, 0);
    const plan = buildPlan(c, decision, DEFAULT_POLICY, "n8n");
    expect(plan.steps.map((s) => s.name)).toEqual(["reply", "improve", "educate", "qa", "approval"]);
    // 返信送信の自動化はない（承認後も publish ステップなし = 手動送信）
    expect(plan.steps.some((s) => s.kind === "publish")).toBe(false);
    expect(plan.approvalRequired).toBe(true);
  });
});
