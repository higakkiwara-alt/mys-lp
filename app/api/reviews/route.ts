import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireAuthFromRequest } from "@/lib/auth";
import { generateQrSet } from "@/lib/qrcode";
import { generateContent } from "@/lib/claude";

const PLACE_ID = process.env.GOOGLE_PLACE_ID ?? "ChIJxxxxxxxxxxxxx";
const LINE_ID = process.env.LINE_CHANNEL_ID ?? "@mys-salon";
const BOOKING_URL = process.env.BOOKING_URL ?? "https://beauty.hotpepper.jp/slnH000000000/";

const QR_TYPES = ["review", "line", "booking"] as const;

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("generate-reply"),
    reviewId: z.string().max(100),
    reviewText: z.string().min(1).max(500),
    rating: z.number().int().min(1).max(5),
    authorName: z.string().min(1).max(100),
  }),
  z.object({
    action: z.literal("generate-qr"),
    type: z.enum(QR_TYPES).optional(),
    size: z.number().int().min(100).max(1000).optional(),
  }),
]);

function sanitize(s: string): string {
  return s.replace(/<[^>]*>/g, "").slice(0, 500);
}

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

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
  const authError = requireAuthFromRequest(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const parsed = postSchema.parse(body);

    if (parsed.action === "generate-reply") {
      const safeAuthor = sanitize(parsed.authorName);
      const safeText = sanitize(parsed.reviewText);
      const prompt = `Google口コミへの返信を作成。美容室Mys（ミース）立川。
お客様: ${safeAuthor}様
評価: ${parsed.rating}星
口コミ: ${safeText}
150文字以内、丁寧で温かみのある返信。`;
      const reply = await generateContent(prompt);
      return NextResponse.json({ reply, reviewId: parsed.reviewId });
    }

    if (parsed.action === "generate-qr") {
      const qrSet = generateQrSet({
        placeId: PLACE_ID,
        lineId: LINE_ID,
        bookingUrl: BOOKING_URL,
        size: parsed.size ?? 300,
      });
      const type = parsed.type ?? "review";
      return NextResponse.json({ qrUrl: qrSet[type] ?? qrSet.review });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("[reviews]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
