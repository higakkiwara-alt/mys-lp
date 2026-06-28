import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireAuthFromRequest } from "@/lib/auth";
import { generateContent } from "@/lib/claude";

const MOCK_NEGATIVE_REVIEWS = [
  { competitor: "立川ヘアサロンA", rating: 1, text: "縮毛矯正が1週間で取れた。お金の無駄", date: "2024-06-10" },
  { competitor: "立川ヘアサロンA", rating: 2, text: "予約を忘れられた。スタッフの対応が冷たい", date: "2024-06-08" },
  { competitor: "ヘアサロンC 立川", rating: 2, text: "値段が高い割に仕上がりが普通だった", date: "2024-06-05" },
  { competitor: "立川美容室B", rating: 1, text: "カラーで頭皮が荒れた。説明不足", date: "2024-06-01" },
  { competitor: "ヘアサロンC 立川", rating: 2, text: "待ち時間が長すぎる。予約してるのに1時間待った", date: "2024-05-28" },
];

const MOCK_ADS = [
  {
    id: "1",
    targetPain: "縮毛矯正の失敗・持ちが悪い",
    headline: "縮毛矯正で失敗した方へ — Mysが再生します",
    body: "「1週間で取れた」「ビビり毛になった」そんな失敗はもう終わり。髪質改善専門のMys（ミース）が、ダメージゼロの縮毛矯正で別人級のストレートヘアに。立川駅徒歩5分。",
    platform: "Instagram",
    status: "active",
  },
  {
    id: "2",
    targetPain: "スタッフ対応・予約管理が悪い",
    headline: "予約を大切に、あなたの時間を尊重するサロン",
    body: "完全予約制・完全個室でお待たせしません。丁寧なカウンセリングと確実な技術で、毎回満足のいく仕上がりを。",
    platform: "Google",
    status: "draft",
  },
];

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("generate-ad"),
    painPoint: z.string().min(1).max(300),
  }),
  z.object({
    action: z.literal("analyze-competitors"),
  }),
]);

function sanitize(s: string): string {
  return s.replace(/<[^>]*>/g, "").slice(0, 300);
}

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  const painPoints = [
    { pain: "縮毛矯正の失敗・持ちが悪い", count: 2, competitors: ["立川ヘアサロンA"] },
    { pain: "スタッフ対応・予約管理", count: 2, competitors: ["立川ヘアサロンA", "ヘアサロンC 立川"] },
    { pain: "コストパフォーマンス", count: 1, competitors: ["ヘアサロンC 立川"] },
    { pain: "頭皮・ダメージへの配慮不足", count: 1, competitors: ["立川美容室B"] },
  ];
  return NextResponse.json({ negativeReviews: MOCK_NEGATIVE_REVIEWS, painPoints, ads: MOCK_ADS });
}

export async function POST(req: NextRequest) {
  const authError = requireAuthFromRequest(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const parsed = postSchema.parse(body);

    if (parsed.action === "generate-ad") {
      const safePain = sanitize(parsed.painPoint);
      const prompt = `競合他社の口コミから発見した顧客の不満に対応するMys（ミース）の広告コピーを作成。
顧客の不満: ${safePain}
広告形式: {"headline": "30字以内", "body": "150字以内", "cta": "行動喚起15字以内", "platform": "Instagram"}`;
      const raw = await generateContent(prompt);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const ad = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : { headline: raw.slice(0, 30), body: raw, cta: "今すぐ予約", platform: "Instagram" };
      return NextResponse.json({ ad });
    }

    if (parsed.action === "analyze-competitors") {
      const summary = await generateContent(
        `競合他社の低評価口コミを分析: ${MOCK_NEGATIVE_REVIEWS.map((r) => r.text).join("、")}。Mysが差別化できるポイントを3つ提案。`
      );
      return NextResponse.json({ summary, painPoints: MOCK_NEGATIVE_REVIEWS });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("[competitor/steal]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
