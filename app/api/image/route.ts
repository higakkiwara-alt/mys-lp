import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthFromRequest } from "@/lib/auth";
import { sanitizeUserInput } from "@/lib/ai-security";

// SSRF protection: only allow specific trusted hostnames for image URLs
const ALLOWED_IMAGE_HOSTS = new Set([
  "images.unsplash.com",
  "lh3.googleusercontent.com",
  "oaidalleapiprodscus.blob.core.windows.net",
  "storage.googleapis.com",
]);

function isSafeImageUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return false;
    return ALLOWED_IMAGE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

const generateSchema = z.object({
  prompt: z.string().min(1).max(500),
  type: z.enum(["before-after", "background", "caption"]).optional().default("caption"),
  imageUrl: z.string().url().max(2048).optional(),
  size: z.enum(["1024x1024", "1792x1024", "1024x1792"]).optional().default("1024x1024"),
});

export async function POST(req: NextRequest) {
  const authErr = requireAuthFromRequest(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { prompt, type, imageUrl, size } = generateSchema.parse(body);

    // SSRF protection: validate imageUrl against allowlist
    if (imageUrl && !imageUrl.startsWith("data:") && !isSafeImageUrl(imageUrl)) {
      return NextResponse.json(
        { error: "Image URL host is not allowed" },
        { status: 400 }
      );
    }

    const { generateImage, generateSalonCaption, removeBackground } = await import("@/lib/openai");

    if (type === "caption" && imageUrl) {
      const captions = await generateSalonCaption(imageUrl);
      return NextResponse.json({ type: "caption", captions });
    }

    if (type === "background" && imageUrl) {
      const base64Match = imageUrl.match(/^data:image\/[a-z]+;base64,(.+)$/);
      if (!base64Match) {
        return NextResponse.json({ error: "Background removal requires a base64 data URL" }, { status: 400 });
      }
      const processed = await removeBackground(base64Match[1]);
      return NextResponse.json({ type: "background", imageUrl: processed });
    }

    const sanitizedPrompt = sanitizeUserInput(prompt, 500);
    const salonPrompt = `高品質な日本の美容室「Mys（ミース）」のプロフェッショナルな画像。${sanitizedPrompt} スタイル: 清潔感があり高級感のある美容室、ゴールドとクリームの配色、プロフェッショナルな撮影品質。テキストなし、ロゴなし。写真リアリスティックスタイル。`;

    const url = await generateImage(salonPrompt, size);
    return NextResponse.json({ type: "generated", imageUrl: url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("[image/route]", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Image processing failed" }, { status: 500 });
  }
}
