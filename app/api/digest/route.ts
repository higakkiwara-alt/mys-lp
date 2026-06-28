import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  try {
    const { generateDailyDigest } = await import("@/lib/claude");

    const mockData = {
      metrics: {
        googleRank: 3,
        rating: 4.71,
        newCustomersThisMonth: 28,
        repeatRate: 0.73,
        lineFollowers: 342,
        instagramFollowers: 1247,
      },
      reviews: [
        { rating: 5, text: "縮毛矯正が全然ダメージを感じない！こんなにサラサラになるとは思っていなかったです。" },
        { rating: 5, text: "カウンセリングがとても丁寧で、自分の髪質に合った提案をしてくれました。" },
      ],
      keywords: [
        { keyword: "縮毛矯正 立川", rank: 3, prev: 4 },
        { keyword: "髪質改善 立川", rank: 7, prev: 5 },
      ],
    };

    const digest = await generateDailyDigest(mockData);
    return NextResponse.json({
      date: new Date().toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      }),
      ...digest,
    });
  } catch (error) {
    console.error("[digest/route]", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Failed to generate digest" }, { status: 500 });
  }
}
