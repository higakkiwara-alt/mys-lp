import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/claude";
import { z } from "zod";

const ALLOWED_CHANNELS = ["instagram", "line", "web"] as const;

const inquirySchema = z.object({
  message: z.string().min(1).max(500),
  channel: z.enum(ALLOWED_CHANNELS).optional().default("web"),
});

const SALON_CONTEXT = `
あなたはMys（ミース）立川の24時間対応AIアシスタントです。
特徴: 髪質改善・縮毛矯正専門、立川駅徒歩5分、完全予約制、高品質・適正価格。
メニュー: 縮毛矯正28,000円〜、髪質改善トリートメント15,000円〜、カラー12,000円〜。
予約: ホットペッパービューティー、LINE、電話。
定休日: 火曜日。
サロン以外の話題（政治・宗教・個人情報・有害コンテンツ）には応答しないでください。
`.trim();

const MOCK_INQUIRIES = [
  { id: "1", channel: "instagram", message: "縮毛矯正の値段を教えてください", createdAt: "2024-06-20 22:15", replied: true },
  { id: "2", channel: "line", message: "初めてなんですが予約できますか？", createdAt: "2024-06-20 01:30", replied: true },
  { id: "3", channel: "web", message: "髪が傷みやすいのですが大丈夫ですか？", createdAt: "2024-06-19 23:45", replied: false },
];

export async function GET() {
  const stats = {
    totalInquiries: 47,
    autoReplied: 44,
    conversionRate: 68,
    avgResponseTime: "2.3分",
    topChannels: [
      { channel: "Instagram", count: 21 },
      { channel: "LINE", count: 18 },
      { channel: "Web", count: 8 },
    ],
  };
  return NextResponse.json({ inquiries: MOCK_INQUIRIES, stats });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, channel } = inquirySchema.parse(body);

    // Sanitize user input to prevent prompt injection
    const sanitized = message.replace(/[<>]/g, "").trim();

    const systemPrompt = `${SALON_CONTEXT}\nチャンネル: ${channel}\n丁寧、簡潔（200字以内）、予約を促す。`;
    const reply = await generateContent(`お客様のお問い合わせ: ${sanitized}`, systemPrompt);

    return NextResponse.json({
      reply,
      channel,
      suggestedActions: ["予約ページへ誘導", "LINE登録を促す", "メニュー詳細を共有"],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
    }
    console.error("[sales/route]", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Failed to generate reply" }, { status: 500 });
  }
}
