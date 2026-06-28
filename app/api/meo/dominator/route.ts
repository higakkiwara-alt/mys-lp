import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/claude";
import { verifyCronSecret } from "@/lib/auth";
import { z } from "zod";

const MOCK_COMPETITORS = [
  { name: "立川ヘアサロンA", rating: 4.2, reviewCount: 89, photoCount: 45, rank: 1 },
  { name: "Mys（ミース）", rating: 4.6, reviewCount: 134, photoCount: 72, rank: 2 },
  { name: "立川美容室B", rating: 4.1, reviewCount: 56, photoCount: 30, rank: 3 },
  { name: "ヘアサロンC 立川", rating: 4.4, reviewCount: 201, photoCount: 88, rank: 4 },
];

const MOCK_ACTIONS = [
  { id: "1", type: "photo", title: "施術写真を5枚追加", priority: "high", impact: "+0.3ランク向上", done: false },
  { id: "2", type: "post", title: "週2回の投稿を継続", priority: "high", impact: "上位表示維持", done: false },
  { id: "3", type: "review", title: "レビュー返信を24h以内に", priority: "medium", impact: "+12%エンゲージ", done: false },
  { id: "4", type: "keyword", title: "「立川 髪質改善」キーワード強化", priority: "high", impact: "検索順位+2位", done: false },
];

const actionSchema = z.object({
  action: z.enum(["analyze", "generate-post"]),
  keyword: z.string().max(100).optional(),
});

export async function GET(req: NextRequest) {
  // GET is called by Vercel cron
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  return NextResponse.json({
    competitors: MOCK_COMPETITORS,
    myRank: 2,
    targetRank: 1,
    gapAnalysis: {
      reviewGap: MOCK_COMPETITORS[0].reviewCount - MOCK_COMPETITORS[1].reviewCount,
      photoGap: MOCK_COMPETITORS[0].photoCount - MOCK_COMPETITORS[1].photoCount,
      ratingGap: MOCK_COMPETITORS[1].rating - MOCK_COMPETITORS[0].rating,
    },
    actions: MOCK_ACTIONS,
    weeklyProgress: [
      { week: "5/W1", rank: 5, reviews: 120, photos: 60 },
      { week: "5/W2", rank: 4, reviews: 125, photos: 63 },
      { week: "5/W3", rank: 3, reviews: 128, photos: 67 },
      { week: "5/W4", rank: 2, reviews: 134, photos: 72 },
    ],
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, keyword } = actionSchema.parse(body);

    if (action === "analyze") {
      const prompt = `MEO競合分析: 立川エリアの美容室で現在2位。1位との差: レビュー数-${MOCK_COMPETITORS[0].reviewCount - MOCK_COMPETITORS[1].reviewCount}件。今週実行すべき具体的なアクション3つを日本語で提案してください。`;
      const analysis = await generateContent(prompt);
      return NextResponse.json({ analysis, actions: MOCK_ACTIONS });
    }

    if (action === "generate-post") {
      const kw = (keyword ?? "立川 髪質改善").slice(0, 50);
      const post = await generateContent(
        `Google ビジネスプロフィール投稿を作成。キーワード: ${kw}。150文字以内、行動喚起あり。`
      );
      return NextResponse.json({ post });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("[meo/dominator]", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
