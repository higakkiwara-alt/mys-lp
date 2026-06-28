import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/claude";

const SALON_CONTEXT = `
あなたはMys（ミース）立川の24時間対応AIアシスタントです。
特徴: 髪質改善・縮毛矯正専門、立川駅徒歩5分、完全予約制、高品質・適正価格。
メニュー: 縮毛矯正28,000円〜、髪質改善トリートメント15,000円〜、カラー12,000円〜。
予約: ホットペッパービューティー、LINE、電話（042-XXX-XXXX）。
定休日: 火曜日。
`;

const MOCK_INQUIRIES = [
  { id: "1", channel: "instagram", message: "縮毛矯正の値段を教えてください", createdAt: "2024-06-20 22:15", replied: true, response: "28,000円〜となっております。ダメージ度合いにより変わります。" },
  { id: "2", channel: "line", message: "初めてなんですが予約できますか？", createdAt: "2024-06-20 01:30", replied: true, response: "はい、もちろんです！ホットペッパーからご予約いただけます。" },
  { id: "3", channel: "web", message: "髪が傷みやすいのですが大丈夫ですか？", createdAt: "2024-06-19 23:45", replied: false, response: null },
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
  const { message, channel } = await req.json();

  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });

  const systemPrompt = SALON_CONTEXT + `\nチャンネル: ${channel ?? "web"}\n丁寧、簡潔（200字以内）、予約を促す。`;
  const reply = await generateContent(message, systemPrompt);

  return NextResponse.json({
    reply,
    channel: channel ?? "web",
    suggestedActions: ["予約ページへ誘導", "LINE登録を促す", "メニュー詳細を共有"],
  });
}
