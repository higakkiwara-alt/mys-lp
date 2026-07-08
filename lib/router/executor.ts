import Anthropic from "@anthropic-ai/sdk";
import { MODELS, type ModelId } from "./models";
import type { Classification } from "./classifier";
import type { Route } from "./routes";
import { searchVaultContext } from "@/lib/obsidian/vault";

// ステップ実行（Day1: 単発実行）
// - Fable 5: server-side fallbacks で refusal 時に Opus 4.8 へ自動フォールバック
// - 実行前に必ず Obsidian を参照（オーナー指示: Company OS が Source of Truth）

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey });
  }
  return client;
}

// Agent 人格（Day1 最小セット。プロンプト本体は Day7 以降 Vault の Prompt/ へ移管）
// 固定文字列 + cache_control でプロンプトキャッシュを効かせる
const AGENT_SYSTEM: Record<string, string> = {
  CEO: `あなたは大竹一樹（美容室Mys立川オーナー）の経営参謀AI。
結論から述べ、根拠・リスク・代替案を添える。
提供された過去の判断ログ・価値観（Obsidian）と矛盾しないか必ず確認し、矛盾する場合は指摘する。
出力の最後に「■判断ログ」として 背景/選択肢/決定(推奨)/理由 を構造化して付ける。`,
  COO: `あなたは AI COO（執行責任者）。大竹一樹の依頼を実行し、簡潔・実用的に応える。
結論から述べる。タスクは分解し、優先度と次のアクションを明示する。`,
  SNS: `あなたは美容室「Mys（ミース）」立川・髪質改善専門サロンのSNS担当AI。
上品で専門性の高いトーンを守る。冒頭1行でスクロールを止める。
投稿は必ずオーナー承認後に公開される前提で下書きを作る。`,
  Education: `あなたは教育コンテンツ設計AI。学習目標→構成→本文の順で、実践しやすい教材を作る。`,
  Knowledge: `あなたはナレッジ管理AI。情報を構造化し、Obsidian（Company OS）に蓄積しやすい形に整理する。`,
  CTO: `あなたは技術責任者AI。実装タスクを Claude Code に渡せる形（要件/対象/完了条件/注意点）に定義する。`,
  Video: `あなたは動画企画AI。フック→本編→CTAの構成で台本を作る。`,
  "Sheets/Notion": `あなたはデータ整理AI。必要なデータ操作を具体的な手順に落とす。`,
  Automation: `あなたは自動化設計AI。n8nワークフロー（トリガー→ノード→出力）として設計する。`,
};

export type ExecutionResult = {
  output: string;
  model: ModelId; // 実際に応答したモデル（フォールバック後）
  inputTokens: number;
  outputTokens: number;
  vaultRefs: string[]; // 参照した Obsidian ノート
};

export async function executeRoute(
  input: string,
  c: Classification,
  route: Route
): Promise<ExecutionResult> {
  const anthropic = getClient();

  // 1) Obsidian（Company OS）を必ず参照してから判断する
  const vault = await searchVaultContext([c.domain, ...c.tags, c.title].join(" "));

  const contextBlock = vault.notes.length
    ? `\n\n【Company OS（Obsidian）の関連ノート — 判断の前提として必ず考慮】\n${vault.notes
        .map((n) => `--- ${n.path} ---\n${n.excerpt}`)
        .join("\n")}`
    : "";

  const handoffBlock = route.handoffNote ? `\n\n【実行方針】${route.handoffNote}` : "";

  const userContent = `依頼: ${input}${handoffBlock}${contextBlock}`;
  const system = [
    {
      type: "text" as const,
      text: AGENT_SYSTEM[route.agent] ?? AGENT_SYSTEM.COO,
      cache_control: { type: "ephemeral" as const },
    },
  ];

  // 2) モデル実行
  if (route.model === MODELS.FABLE) {
    // Fable 5: thinking常時ON（パラメータ不要）・refusal時はOpus 4.8へサーバー側フォールバック
    const message = await anthropic.beta.messages.create({
      model: MODELS.FABLE,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-06-01"],
      fallbacks: [{ model: MODELS.OPUS }],
      system,
      messages: [{ role: "user", content: userContent }],
    });
    if (message.stop_reason === "refusal") {
      throw new Error("Fable 5 とフォールバック先の両方が応答を拒否しました");
    }
    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");
    return {
      output: text,
      model: (message.model.startsWith(MODELS.OPUS) ? MODELS.OPUS : MODELS.FABLE) as ModelId,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      vaultRefs: vault.notes.map((n) => n.path),
    };
  }

  const message = await anthropic.messages.create({
    model: route.model,
    max_tokens: 8192,
    system,
    ...(route.useWebSearch
      ? { tools: [{ type: "web_search_20260209" as const, name: "web_search" as const }] }
      : {}),
    messages: [{ role: "user", content: userContent }],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n");

  return {
    output: text,
    model: route.model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    vaultRefs: vault.notes.map((n) => n.path),
  };
}
