import { MODELS, type ModelId } from "./models";
import type { Classification } from "./classifier";
import type { RouterPolicy } from "./config";
import type { ModelDecision } from "./guard";
import { estimateCostUsd } from "./pricing";

// ルーティングテーブル（docs/ai-router-os/01 §3）
// Day1 は単発実行のみ。パイプライン（複数ステップ連携）は Day7。

export type Route = {
  kind: "llm" | "handoff"; // llm=このシステムで実行 / handoff=外部Agent向けタスク定義を生成
  step: string; // think | create_text | search | knowledge | ...
  agent: string; // 担当Agent名（ログ・Obsidian記録用）
  model: ModelId;
  useWebSearch?: boolean;
  /** handoff時: 何をすべきかの説明（Day7以降で実Agentに置換） */
  handoffNote?: string;
  estimatedUsd: number;
};

export function decideRoute(c: Classification, decision: ModelDecision, _policy: RouterPolicy): Route {
  switch (c.intent) {
    case "think":
      return {
        kind: "llm",
        step: "think",
        agent: c.domain === "経営" || c.domain === "財務" ? "CEO" : "COO",
        model: decision.model,
        estimatedUsd: estimateCostUsd(decision.model === MODELS.FABLE ? "think_deep" : "think", decision.model),
      };
    case "create_text":
      return {
        kind: "llm",
        step: "create_text",
        agent: c.domain === "SNS" ? "SNS" : c.domain === "教育" ? "Education" : "COO",
        model: MODELS.SONNET,
        estimatedUsd: estimateCostUsd("create_text", MODELS.SONNET),
      };
    case "search":
      return {
        kind: "llm",
        step: "search",
        agent: "COO",
        model: MODELS.SONNET,
        useWebSearch: true,
        estimatedUsd: estimateCostUsd("search", MODELS.SONNET),
      };
    case "knowledge":
      return {
        kind: "llm",
        step: "knowledge",
        agent: "Knowledge",
        model: MODELS.SONNET,
        estimatedUsd: estimateCostUsd("knowledge", MODELS.SONNET),
      };
    case "create_code":
      return {
        kind: "handoff",
        step: "create_code",
        agent: "CTO",
        model: MODELS.SONNET,
        handoffNote:
          "Claude Code 向けのタスク定義（要件・対象ファイル・完了条件）を生成します。実装は Claude Code セッションで行ってください。",
        estimatedUsd: estimateCostUsd("default", MODELS.SONNET),
      };
    case "create_image":
      return {
        kind: "handoff",
        step: "create_image",
        agent: "SNS",
        model: MODELS.SONNET,
        handoffNote: "画像生成プロンプトを生成します（画像生成APIとの接続は Day7 パイプラインで実装）。",
        estimatedUsd: estimateCostUsd("default", MODELS.SONNET),
      };
    case "create_video":
      return {
        kind: "handoff",
        step: "create_video",
        agent: "Video",
        model: MODELS.SONNET,
        handoffNote: "動画の構成台本を生成します（動画生成AIとの接続は Day90 で実装）。",
        estimatedUsd: estimateCostUsd("create_text", MODELS.SONNET),
      };
    case "data":
      return {
        kind: "handoff",
        step: "data",
        agent: "Sheets/Notion",
        model: MODELS.SONNET,
        handoffNote: "必要なデータ操作の手順書を生成します（Sheets/Notion API接続は Day30 で実装）。",
        estimatedUsd: estimateCostUsd("default", MODELS.SONNET),
      };
    case "automation":
      return {
        kind: "handoff",
        step: "automation",
        agent: "Automation",
        model: MODELS.SONNET,
        handoffNote: "n8n ワークフロー設計案を生成します（n8n API での自動作成は Day30 で実装）。",
        estimatedUsd: estimateCostUsd("default", MODELS.SONNET),
      };
    case "manage":
    default:
      return {
        kind: "llm",
        step: "manage",
        agent: "COO",
        model: MODELS.SONNET,
        estimatedUsd: estimateCostUsd("default", MODELS.SONNET),
      };
  }
}
