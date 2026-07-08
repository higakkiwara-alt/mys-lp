import Anthropic from "@anthropic-ai/sdk";
import { MODELS, type ModelId } from "./models";

// Agent 呼び出し（Orchestrator の各ステップから使用）
// - Fable 5: server-side fallbacks で refusal 時に Opus 4.8 へ自動フォールバック
// - システムプロンプトは固定文字列 + cache_control でプロンプトキャッシュを効かせる

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey });
  }
  return client;
}

// Agent 人格（プロンプト本体は Day30 で Vault の Prompts/ へ移管）
export const AGENT_SYSTEM: Record<string, string> = {
  CEO: `あなたは大竹一樹（美容室Mys立川オーナー）の経営参謀AI。
結論から述べ、根拠・リスク・代替案を添える。
提供された過去の判断ログ・会社方針・価値観（Obsidian/Company OS）と矛盾しないか必ず確認し、矛盾する場合は指摘する。
出力の最後に「■判断ログ」として 背景/選択肢/決定(推奨)/理由 を構造化して付ける。`,
  COO: `あなたは AI COO（執行責任者）。大竹一樹の依頼を実行し、簡潔・実用的に応える。
結論から述べる。タスクは分解し、優先度と次のアクションを明示する。`,
  SNS: `あなたは美容室「Mys（ミース）」立川・髪質改善専門サロンのSNS担当AI。
上品で専門性の高いトーンを守る。冒頭1行でスクロールを止める。
投稿は必ずオーナー承認後に公開される前提で下書きを作る。`,
  Education: `あなたは教育コンテンツ設計AI。学習目標→構成→本文の順で、実践しやすい教材を作る。`,
  Knowledge: `あなたはナレッジ管理AI。情報を構造化し、Obsidian（Company OS）に蓄積しやすい形に整理する。
過去の知識との重複・矛盾があれば指摘する。`,
  CTO: `あなたは技術責任者AI。実装タスクを Claude Code に渡せる形（要件/対象/完了条件/注意点）に定義する。`,
  Video: `あなたは動画企画AI。フック→本編→CTAの構成で台本を作る。`,
  "Sheets/Notion": `あなたはデータ整理AI。必要なデータ操作を具体的な手順に落とす。`,
  Automation: `あなたは自動化設計AI。n8nワークフロー（トリガー→ノード→出力）として設計する。`,
  QA: `あなたは品質管理AI。成果物をブランド適合・事実確認・誤字・リスク（法務/炎上）の観点でチェックする。`,
  SalesAnalyst: `あなたは営業分析AI（美容室Mysの商談・カウンセリング専門）。
BMU動画・商談記録から不成約/成約の構造を分析し、会社の営業資産（反論パターン・FAQ・改善台本・ロールプレイ）を蓄積する。
顧客の実際の言葉を引用して分析する。抽象論でなく、明日のカウンセリングで使える具体性で出力する。`,
  CS: `あなたは口コミ・クレーム対応AI（美容室Mys）。
会社方針・過去の対応（Company OS）と一貫した誠実な対応を設計する。
公開返信は「これから読む見込み客」への文章。言い訳・反論・過剰な値引きはしない。
返信の送信は必ずオーナー承認後（絶対ルール）。`,
};

export type AgentCallResult = {
  output: string;
  model: ModelId; // 実際に応答したモデル（フォールバック後）
  inputTokens: number;
  outputTokens: number;
};

export async function callAgent(opts: {
  agent: string;
  model: ModelId;
  prompt: string;
  useWebSearch?: boolean;
  maxTokens?: number;
}): Promise<AgentCallResult> {
  const anthropic = getClient();
  const system = [
    {
      type: "text" as const,
      text: AGENT_SYSTEM[opts.agent] ?? AGENT_SYSTEM.COO,
      cache_control: { type: "ephemeral" as const },
    },
  ];

  if (opts.model === MODELS.FABLE) {
    // Fable 5: thinking常時ON（パラメータ不要）・refusal時はOpus 4.8へサーバー側フォールバック
    const message = await anthropic.beta.messages.create({
      model: MODELS.FABLE,
      max_tokens: opts.maxTokens ?? 16000,
      betas: ["server-side-fallback-2026-06-01"],
      fallbacks: [{ model: MODELS.OPUS }],
      system,
      messages: [{ role: "user", content: opts.prompt }],
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
    };
  }

  const message = await anthropic.messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 8192,
    system,
    ...(opts.useWebSearch
      ? { tools: [{ type: "web_search_20260209" as const, name: "web_search" as const }] }
      : {}),
    messages: [{ role: "user", content: opts.prompt }],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n");

  return {
    output: text,
    model: opts.model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}
