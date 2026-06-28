import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  keyword: z.string().min(1).max(100),
  type: z.enum(["outline", "full"]).optional().default("outline"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { keyword, type } = schema.parse(body);

    const { generateBlogOutline, generateContent } = await import("@/lib/claude");

    if (type === "outline") {
      const result = await generateBlogOutline(keyword);
      return NextResponse.json(result);
    }

    const outline = await generateBlogOutline(keyword);
    const fullPrompt = `
以下の構成でブログ記事を執筆してください。

タイトル: ${outline.title}
構成:
${outline.outline.map((s, i) => `${i + 1}. ${s}`).join("\n")}

要件:
- ターゲットキーワード「${keyword}」を自然に含める
- 1500〜2000文字
- 読者に価値のある具体的な情報を提供
- Mys（ミース）のサービスに自然につなげる
- マークダウン形式で出力

記事本文のみ出力してください。`;

    const fullContent = await generateContent(fullPrompt);
    return NextResponse.json({ ...outline, content: fullContent });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("[seo/blog]", error);
    return NextResponse.json({ error: "Failed to generate blog content" }, { status: 500 });
  }
}
