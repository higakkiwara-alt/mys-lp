import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/claude";
import { generateBlogOutline } from "@/lib/claude";

const SEED_KEYWORDS = [
  "立川 縮毛矯正",
  "立川 髪質改善",
  "立川 美容室 おすすめ",
  "立川 カラー 上手い",
  "多摩 縮毛矯正",
  "昭島 美容室",
  "国立 髪質改善",
];

const MOCK_LONGTAIL = [
  { keyword: "立川 縮毛矯正 失敗しない", volume: 320, difficulty: 28, intent: "比較", article: null },
  { keyword: "立川 縮毛矯正 値段 安い", volume: 210, difficulty: 22, intent: "価格", article: null },
  { keyword: "立川 髪質改善 効果 期間", volume: 180, difficulty: 19, intent: "情報", article: "generated" },
  { keyword: "立川 美容室 縮毛矯正 口コミ", volume: 290, difficulty: 31, intent: "比較", article: null },
  { keyword: "立川 カラー トリートメント 一緒に", volume: 140, difficulty: 17, intent: "方法", article: null },
  { keyword: "多摩 縮毛矯正 Mys", volume: 90, difficulty: 12, intent: "指名", article: "generated" },
  { keyword: "立川 くせ毛 改善 シャンプー", volume: 160, difficulty: 24, intent: "商品", article: null },
  { keyword: "立川 結婚式 ヘアセット 予約", volume: 120, difficulty: 20, intent: "予約", article: null },
];

export async function GET() {
  return NextResponse.json({
    seedKeywords: SEED_KEYWORDS,
    longtailKeywords: MOCK_LONGTAIL,
    stats: {
      totalKeywords: MOCK_LONGTAIL.length,
      articlesGenerated: MOCK_LONGTAIL.filter((k) => k.article).length,
      totalVolume: MOCK_LONGTAIL.reduce((s, k) => s + k.volume, 0),
      avgDifficulty: Math.round(
        MOCK_LONGTAIL.reduce((s, k) => s + k.difficulty, 0) / MOCK_LONGTAIL.length
      ),
    },
  });
}

export async function POST(req: NextRequest) {
  const { action, keyword, seed } = await req.json();

  if (action === "discover") {
    const prompt = `美容室「Mys（ミース）」立川・髪質改善専門のロングテールキーワードを${seed ?? "立川 縮毛矯正"}の派生で10個発見。
JSON配列: [{"keyword": "", "volume": 100-500, "difficulty": 10-40, "intent": "情報|比較|価格|予約|指名"}]`;
    const raw = await generateContent(prompt);
    const parsed = JSON.parse(raw.match(/\[[\s\S]*\]/)?.[0] ?? "[]");
    return NextResponse.json({ keywords: parsed });
  }

  if (action === "generate-article" && keyword) {
    const { title, outline } = await generateBlogOutline(keyword);
    const articleContent = await generateContent(
      `SEOブログ記事を作成。タイトル: ${title}\nアウトライン: ${JSON.stringify(outline)}\n1500文字以上、自然な日本語、内部リンク指示あり。`
    );
    return NextResponse.json({ title, outline, content: articleContent, keyword });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
