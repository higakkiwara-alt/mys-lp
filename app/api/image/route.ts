import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const generateSchema = z.object({
  prompt: z.string().min(1),
  type: z.enum(["before-after", "background", "caption"]).optional().default("caption"),
  imageUrl: z.string().url().optional(),
  size: z.enum(["1024x1024", "1792x1024", "1024x1792"]).optional().default("1024x1024"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, type, imageUrl, size } = generateSchema.parse(body);
    const { generateImage, generateSalonCaption, removeBackground } = await import("@/lib/openai");

    if (type === "caption" && imageUrl) {
      const captions = await generateSalonCaption(imageUrl);
      return NextResponse.json({ type: "caption", captions });
    }

    if (type === "background" && imageUrl) {
      const base64Match = imageUrl.match(/base64,(.+)/);
      if (!base64Match) return NextResponse.json({ error: "Invalid image URL format" }, { status: 400 });
      const processed = await removeBackground(base64Match[1]);
      return NextResponse.json({ type: "background", imageUrl: processed });
    }

    const salonPrompt = `
高品質な日本の美容室「Mys（ミース）」のプロフェッショナルな画像。
${prompt}
スタイル: 清潔感があり高級感のある美容室、ゴールドとクリームの配色、プロフェッショナルな撮影品質。
テキストなし、ロゴなし。写真リアリスティックスタイル。`.trim();

    const url = await generateImage(salonPrompt, size);
    return NextResponse.json({ type: "generated", imageUrl: url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("[image/route]", error);
    return NextResponse.json({ error: "Image processing failed" }, { status: 500 });
  }
}
