import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthFromRequest } from "@/lib/auth";
import { buildSafePrompt } from "@/lib/ai-security";

const addSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  type: z.enum(["VOICE_MEMO", "MEETING", "MANUAL", "LINE_MESSAGE", "IMAGE_DESC", "AI_PROPOSAL", "CUSTOMER_CARD", "STRATEGY"]),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  source: z.string().max(200).optional(),
});

const querySchema = z.object({
  query: z.string().min(1).max(500),
});

export async function GET(req: NextRequest) {
  const authErr = requireAuthFromRequest(req);
  if (authErr) return authErr;

  return NextResponse.json({
    entries: [],
    message: "Supabase接続後にデータが表示されます。DATABASE_URLを.env.localに設定してください。",
  });
}

export async function POST(req: NextRequest) {
  const authErr = requireAuthFromRequest(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();

    if (body.query !== undefined) {
      const { query } = querySchema.parse(body);
      const { generateContent } = await import("@/lib/claude");
      const prompt = buildSafePrompt(
        "Company Brainに保存された情報を参照して、美容室経営者の以下の質問に答えてください。",
        query,
        "質問の意図に沿って、具体的かつ簡潔に答えてください。"
      );
      const answer = await generateContent(
        prompt,
        "あなたは美容室Mysの知識管理AIです。保存されたデータを参照して、経営者の質問に答えます。"
      );
      return NextResponse.json({ answer });
    }

    const data = addSchema.parse(body);
    return NextResponse.json({
      success: true,
      message: "DB接続後に保存されます",
      data,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("[brain/route]", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
