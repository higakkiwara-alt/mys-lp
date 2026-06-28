import OpenAI from "openai";
import fs from "fs";

let client: OpenAI | null = null;
function getClient() {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    client = new OpenAI({ apiKey });
  }
  return client;
}

export async function transcribeAudio(filePath: string): Promise<string> {
  const openai = getClient();
  const stream = fs.createReadStream(filePath);
  const res = await openai.audio.transcriptions.create({
    file: stream,
    model: "whisper-1",
    language: "ja",
  });
  return res.text;
}

export async function transcribeBuffer(
  buffer: Buffer,
  filename = "audio.webm"
): Promise<string> {
  const openai = getClient();
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  const file = new File([ab], filename, { type: "audio/webm" });
  const res = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "ja",
  });
  return res.text;
}

export async function extractStylistInsights(transcript: string): Promise<{
  techniques: string[];
  customerNeeds: string[];
  products: string[];
  followUpActions: string[];
  summary: string;
}> {
  const openai = getClient();
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "美容室のスタイリストの音声メモを分析するAIです。施術内容、お客様のニーズ、使用商材、フォローアップ項目を日本語で抽出してください。",
      },
      {
        role: "user",
        content: `以下の音声文字起こしからJSON形式で情報を抽出してください:\n\n${transcript}\n\n{"techniques": [], "customerNeeds": [], "products": [], "followUpActions": [], "summary": ""}`,
      },
    ],
    response_format: { type: "json_object" },
  });
  const content = res.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content);
}

export async function generateStylistContent(insights: {
  techniques: string[];
  customerNeeds: string[];
  summary: string;
}): Promise<{
  instagram: string;
  tiktok: string;
  blog: string;
  hashtags: string[];
}> {
  const openai = getClient();
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Mys（ミース）立川の高級美容室のSNSコンテンツ担当。スタイリストの施術メモからInstagram・TikTok・ブログ記事を作成してください。",
      },
      {
        role: "user",
        content: `施術メモ: ${JSON.stringify(insights)}\n\nJSON形式でコンテンツを生成: {"instagram": "", "tiktok": "", "blog": "", "hashtags": []}`,
      },
    ],
    response_format: { type: "json_object" },
  });
  const content = res.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content);
}
