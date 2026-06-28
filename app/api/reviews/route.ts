import { NextRequest, NextResponse } from "next/server";
import { generateQrSet } from "@/lib/qrcode";
import { generateContent } from "@/lib/claude";

const PLACE_ID = process.env.GOOGLE_PLACE_ID ?? "ChIJxxxxxxxxxxxxx";
const LINE_ID = process.env.LINE_CHANNEL_ID ?? "@mys-salon";
const BOOKING_URL = process.env.BOOKING_URL ?? "https://beauty.hotpepper.jp/slnH000000000/";

export async function GET() {
  const qrSet = generateQrSet({
    placeId: PLACE_ID,
    lineId: LINE_ID,
    bookingUrl: BOOKING_URL,
    size: 300,
  });

  const recentReviews = [
    { id: "1", author: "山田様", rating: 5, text: "縮毛矯正が本当に綺麗に仕上がりました！", replied: true, date: "2024-06-20" },
    { id: "2", author: "鈴木様", rating: 4, text: "スタッフさんが親切でした。また来ます。", replied: false, date: "2024-06-18" },
    { id: "3", author: "田中様", rating: 5, text: "髪質が劇的に改善されて感動！", replied: false, date: "2024-06-15" },
  ];

  const stats = {
    averageRating: 4.6,
    totalReviews: 134,
    responseRate: 89,
    recentMonthCount: 18,
    fiveStarRate: 72,
  };

  return NextResponse.json({ qrSet, recentReviews, stats });
}

export async function POST(req: NextRequest) {
  const { action, reviewId, reviewText, rating, authorName } = await req.json();

  if (action === "generate-reply") {
    const prompt = `Google口コミへの返信を作成。美容室Mys（ミース）立川。
お客様: ${authorName}様
評価: ${rating}星
口コミ: ${reviewText}
150文字以内、丁寧で温かみのある返信。`;
    const reply = await generateContent(prompt);
    return NextResponse.json({ reply, reviewId });
  }

  if (action === "generate-qr") {
    const { type, size } = await req.json().catch(() => ({ type: "review", size: 300 }));
    const qrSet = generateQrSet({ placeId: PLACE_ID, lineId: LINE_ID, bookingUrl: BOOKING_URL, size: size ?? 300 });
    return NextResponse.json({ qrUrl: qrSet[type as keyof typeof qrSet] ?? qrSet.review });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
