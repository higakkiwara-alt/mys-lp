import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey });
  }
  return client;
}

export async function generateContent(prompt: string, systemPrompt?: string): Promise<string> {
  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt ?? "あなたは日本の美容室「Mys（ミース）」のマーケティングAIアシスタントです。立川・髪質改善専門サロンのブランドに合った、上品で専門性の高いコンテンツを作成します。",
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return block.text;
}

export async function expandContent(
  instagramPost: string,
  platforms: string[]
): Promise<Array<{ platform: string; content: string; title?: string; hashtags?: string[] }>> {
  const platformGuides: Record<string, string> = {
    google: "Google Business Profile投稿（300文字以内、地域・サービス名を含める）",
    line: "LINE公式アカウント配信（親しみやすい口調、絵文字適度に使用）",
    wordpress: "WordPressブログ記事（SEO最適化、600文字以上、H2/H3見出し含む）",
    tiktok: "TikTok動画台本（15〜60秒、引きのある冒頭、テロップ向け短文）",
    youtube: "YouTube Shorts説明文・タイトル（SEOキーワード含む）",
    x: "X(Twitter)投稿（140文字以内、ハッシュタグ3つ）",
    note: "note記事（ストーリー形式、1500文字以上、専門知識をわかりやすく）",
  };

  const requestedPlatforms = platforms.filter((p) => platformGuides[p]);
  const prompt = `
以下のInstagram投稿を、各プラットフォーム向けに最適化したコンテンツに展開してください。

【元のInstagram投稿】
${instagramPost}

【展開先】
${requestedPlatforms.map((p) => `- ${p}: ${platformGuides[p]}`).join("\n")}

各プラットフォームの出力をJSON配列で返してください:
[
  {
    "platform": "google",
    "content": "...",
    "hashtags": ["#タグ1", "#タグ2"]
  },
  ...
]

JSONのみ返してください。説明不要。`;

  const result = await generateContent(prompt);
  const jsonMatch = result.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Failed to parse JSON from Claude response");
  return JSON.parse(jsonMatch[0]);
}

export async function generateBlogOutline(keyword: string): Promise<{ title: string; outline: string[] }> {
  const prompt = `
SEOに最適化されたブログ記事の構成を作成してください。

ターゲットキーワード: ${keyword}
サロン: Mys（ミース）立川・髪質改善専門サロン

以下のJSON形式で返してください:
{
  "title": "記事タイトル（60文字以内）",
  "outline": ["見出し1", "見出し2", ...]
}

JSONのみ返してください。`;

  const result = await generateContent(prompt);
  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse JSON");
  return JSON.parse(jsonMatch[0]);
}

export async function generateReviewReply(review: { author: string; rating: number; text: string }): Promise<string> {
  const prompt = `
以下のGoogle口コミに対する返信を作成してください。

レビュアー: ${review.author}様
評価: ${review.rating}星
口コミ内容: ${review.text}

要件:
- 150文字以内
- 丁寧で温かみのある口調
- 具体的な言及を含める
- 「Mys スタッフ一同」で締める

返信文のみ返してください。`;

  return generateContent(prompt);
}

export async function generateDailyDigest(data: {
  metrics: Record<string, string | number>;
  reviews: Array<{ rating: number; text: string }>;
  keywords: Array<{ keyword: string; rank: number; prev: number }>;
}): Promise<{
  achievements: string[];
  tasks: Array<{ priority: string; task: string; module: string }>;
  improvements: string[];
  alert?: string;
}> {
  const prompt = `
美容室Mysの昨日のデータを分析して、CEOへの日次レポートを作成してください。

【データ】
${JSON.stringify(data, null, 2)}

以下のJSON形式で返してください:
{
  "achievements": ["昨日の成果1", "成果2"],
  "tasks": [
    {"priority": "high|medium|low", "task": "タスク内容", "module": "モジュール名"}
  ],
  "improvements": ["改善提案1", "提案2"],
  "alert": "緊急の警告があれば（任意）"
}

JSONのみ返してください。`;

  const result = await generateContent(prompt);
  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse JSON");
  return JSON.parse(jsonMatch[0]);
}
