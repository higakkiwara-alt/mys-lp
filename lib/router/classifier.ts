import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { MODELS } from "./models";

// 依頼の分類（Complexity判定を含む）。Haiku 4.5 使用（全依頼に前置きしても ≈$0.003/件）
// 参照: docs/ai-router-os/01-ai-router.md §2

export const ClassificationSchema = z.object({
  intent: z.enum([
    "think", // 思考・分析・判断・壁打ち
    "create_text", // 文章生成
    "create_code", // コード生成・実装
    "create_image", // 画像
    "create_video", // 動画
    "search", // 検索・最新情報
    "data", // スプレッドシート/Notion等のデータ操作
    "automation", // 定型自動化（n8n）
    "knowledge", // ナレッジ保存・検索（Obsidian）
    "manage", // タスク管理・進捗
  ]),
  domain: z.enum(["経営", "美容室", "SNS", "教育", "営業", "採用", "財務", "法務", "技術", "その他"]),
  output_type: z.string(), // 回答 | 文書 | コード | 画像 | ...
  complexity: z.number().min(1).max(5),
  urgency: z.enum(["now", "today", "this_week"]),
  needs_approval: z.boolean(), // 外部発信・支出を伴うか
  fable_worthiness: z
    .string()
    .describe("Fable 5（最高知能・最高コスト）を使う価値がある場合、その理由。不要なら空文字"),
  title: z.string().describe("この依頼の短いタイトル（Obsidianノート名に使用）"),
  tags: z.array(z.string()).max(6).describe("Obsidian用タグ（日本語、既存語彙優先）"),
});

export type Classification = z.infer<typeof ClassificationSchema>;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey });
  }
  return client;
}

const SYSTEM = `あなたは AI Router OS の分類器。美容室経営者（大竹一樹）の依頼を解析し、JSONのみを返す。

判定基準:
- complexity: 1=定型作業 2=軽い生成 3=通常の思考/生成 4=経営判断・戦略・深い分析 5=会社の方向性を左右する重要判断
- intent=think かつ complexity>=4 は最高知能モデル(Fable 5)候補。fable_worthiness に「なぜ高コストモデルに値するか」を書く（値しないなら空文字）
- needs_approval: SNS投稿・顧客への送信・支出など、外部に影響する場合 true
- tags: 経営/美容室/SNS/Instagram/採用 など汎用的な語彙で`;

export async function classify(input: string): Promise<{
  classification: Classification;
  inputTokens: number;
  outputTokens: number;
}> {
  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 1024,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `次の依頼を分類してJSONのみ返してください。

依頼: ${input}

JSON形式:
{"intent":"think|create_text|create_code|create_image|create_video|search|data|automation|knowledge|manage","domain":"経営|美容室|SNS|教育|営業|採用|財務|法務|技術|その他","output_type":"回答","complexity":1,"urgency":"now|today|this_week","needs_approval":false,"fable_worthiness":"","title":"短いタイトル","tags":["タグ"]}`,
      },
    ],
  });

  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("Classifier returned no text");
  const jsonMatch = block.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Classifier returned no JSON");

  const classification = ClassificationSchema.parse(JSON.parse(jsonMatch[0]));
  return {
    classification,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}
