import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    client = new OpenAI({ apiKey });
  }
  return client;
}

export async function generateImage(prompt: string, size: "1024x1024" | "1792x1024" | "1024x1792" = "1024x1024"): Promise<string> {
  const openai = getClient();
  const res = await openai.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size,
    quality: "hd",
    style: "natural",
  });
  const url = res.data?.[0]?.url;
  if (!url) throw new Error("No image URL returned");
  return url;
}

export async function removeBackground(imageBase64: string): Promise<string> {
  const removeUrl = "https://api.remove.bg/v1.0/removebg";
  const removeBgKey = process.env.REMOVE_BG_API_KEY;

  if (!removeBgKey) {
    return `data:image/png;base64,${imageBase64}`;
  }

  const formData = new FormData();
  formData.append("image_file_b64", imageBase64);
  formData.append("size", "auto");

  const res = await fetch(removeUrl, {
    method: "POST",
    headers: { "X-Api-Key": removeBgKey },
    body: formData,
  });

  if (!res.ok) throw new Error("remove.bg API failed");
  const buffer = await res.arrayBuffer();
  return `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`;
}

export async function analyzeImage(imageUrl: string, prompt: string): Promise<string> {
  const openai = getClient();
  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl } },
          { type: "text", text: prompt },
        ],
      },
    ],
    max_tokens: 1024,
  });
  return res.choices[0]?.message?.content ?? "";
}

export async function generateSalonCaption(imageUrl: string): Promise<{
  instagram: string;
  google: string;
  hashtags: string[];
}> {
  const description = await analyzeImage(
    imageUrl,
    "この美容室の施術写真を見て、SNS投稿用のキャプションを作成してください。施術内容、仕上がりの特徴を説明してください。"
  );

  const openai = getClient();
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "日本の高級美容室「Mys（ミース）」立川・髪質改善専門のSNS担当です。",
      },
      {
        role: "user",
        content: `以下の施術説明から、Instagram用とGoogle Business用のキャプション、ハッシュタグをJSON形式で作成してください:\n\n${description}\n\n{"instagram": "...", "google": "...", "hashtags": ["#タグ1"]}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = res.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content);
}
