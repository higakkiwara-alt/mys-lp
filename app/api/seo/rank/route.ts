import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/auth";

const MOCK_RANKS = [
  { keyword: "縮毛矯正 立川", rank: 3, prev: 4, volume: 1200 },
  { keyword: "髪質改善 立川", rank: 7, prev: 5, volume: 880 },
  { keyword: "美容室 立川 おすすめ", rank: 12, prev: 12, volume: 3400 },
  { keyword: "縮毛矯正 立川 安い", rank: 5, prev: 6, volume: 590 },
  { keyword: "ショートヘア 縮毛矯正 立川", rank: 2, prev: 3, volume: 320 },
  { keyword: "髪質改善トリートメント 立川", rank: 4, prev: 4, volume: 450 },
];

export async function GET(req: NextRequest) {
  const cronErr = verifyCronSecret(req);
  if (cronErr) return cronErr;

  const { generateContent } = await import("@/lib/claude").catch(() => ({ generateContent: null }));

  let improvements: string[] = [];
  if (generateContent) {
    try {
      const prompt = `以下のSEOキーワード順位データを分析して、改善が必要なキーワードと対策を3つ提案してください:\n${JSON.stringify(MOCK_RANKS)}\n\nJSON配列で返してください: ["提案1", "提案2", "提案3"]`;
      const result = await generateContent(prompt);
      const match = result.match(/\[[\s\S]*\]/);
      if (match) improvements = JSON.parse(match[0]);
    } catch {
      improvements = ["「髪質改善 立川」が5位→7位に低下。記事のリライトを推奨", "内部リンク強化が有効"];
    }
  }

  return NextResponse.json({
    keywords: MOCK_RANKS,
    improvements,
    updatedAt: new Date().toISOString(),
  });
}
