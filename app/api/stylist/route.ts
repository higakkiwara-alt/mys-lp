import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthFromRequest } from "@/lib/auth";

const insightsSchema = z.object({
  techniques: z.array(z.string().max(100)).max(20).optional().default([]),
  customerNeeds: z.array(z.string().max(100)).max(20).optional().default([]),
  products: z.array(z.string().max(100)).max(20).optional().default([]),
  followUpActions: z.array(z.string().max(200)).max(20).optional().default([]),
  summary: z.string().max(500).optional().default(""),
});

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("analyze"),
    transcript: z.string().min(1).max(2000),
  }),
  z.object({
    action: z.literal("generate-content"),
    insights: insightsSchema,
  }),
]);

export async function GET(req: NextRequest) {
  const authErr = requireAuthFromRequest(req);
  if (authErr) return authErr;

  const memos = [
    {
      id: "1",
      stylist: "田中スタイリスト",
      date: "2024-06-20",
      transcript: "本日のお客様は30代女性。縮毛矯正希望。以前他店で失敗した経験あり。Aujuaを使用してダメージケアしながら施術。仕上がりに大変満足。",
      insights: {
        techniques: ["縮毛矯正", "Aujuaトリートメント"],
        customerNeeds: ["ダメージケア", "前回失敗の修正"],
        products: ["Aujua"],
        followUpActions: ["1ヶ月後のホームケア確認"],
        summary: "ダメージを最小限に抑えた縮毛矯正。お客様満足度高。",
      },
      contentGenerated: true,
    },
    {
      id: "2",
      stylist: "佐藤スタイリスト",
      date: "2024-06-19",
      transcript: "カラーリストとしての技術向上のため、バレイヤージュの練習。モデルさんに協力していただき、グラデーションカラーを実施。",
      insights: {
        techniques: ["バレイヤージュ", "グラデーションカラー"],
        customerNeeds: ["トレンドスタイル"],
        products: [],
        followUpActions: ["インスタ投稿用写真撮影"],
        summary: "バレイヤージュ技術の向上。インスタ映えするスタイル完成。",
      },
      contentGenerated: false,
    },
  ];
  return NextResponse.json({ memos });
}

export async function POST(req: NextRequest) {
  const authErr = requireAuthFromRequest(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const parsed = postSchema.parse(body);

    if (parsed.action === "analyze") {
      const { extractStylistInsights } = await import("@/lib/voice");
      const result = await extractStylistInsights(parsed.transcript);
      return NextResponse.json({ insights: result });
    }

    if (parsed.action === "generate-content") {
      const { generateStylistContent } = await import("@/lib/voice");
      const content = await generateStylistContent(parsed.insights);
      return NextResponse.json({ content });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("[stylist/route]", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
