import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const addSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  type: z.enum(["VOICE_MEMO", "MEETING", "MANUAL", "LINE_MESSAGE", "IMAGE_DESC", "AI_PROPOSAL", "CUSTOMER_CARD", "STRATEGY"]),
  tags: z.array(z.string()).optional().default([]),
  source: z.string().optional(),
});

const querySchema = z.object({
  query: z.string().min(1).max(500),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const search = searchParams.get("search");

  return NextResponse.json({
    entries: [],
    message: "Supabase接続後にデータが表示されます。DATABASE_URLを.env.localに設定してください。",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.query) {
      const { query } = querySchema.parse(body);
      const { generateContent } = await import("@/lib/claude");
      const answer = await generateContent(
        `Company Brainに「${query}」に関連する情報があるとして、美容室経営者の質問に答えてください。\n\n質問: ${query}`,
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
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
    }
    console.error("[brain/route]", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
