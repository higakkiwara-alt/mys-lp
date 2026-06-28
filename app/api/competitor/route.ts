import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const searchSchema = z.object({
  keyword: z.string().min(1).max(50),
  area: z.string().max(20).optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keyword = (searchParams.get("keyword") ?? "縮毛矯正 立川").slice(0, 50);

  return NextResponse.json({
    keyword,
    competitors: [],
    insights: [],
    message: "Google Maps API接続後に競合データが自動取得されます。GOOGLE_MAPS_API_KEYを設定してください。",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { keyword, area } = searchSchema.parse(body);

    const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!mapsApiKey) {
      return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY not configured" }, { status: 503 });
    }

    const safeArea = area ?? "立川";
    const query = `美容室 ${safeArea} ${keyword}`;
    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=ja&key=${mapsApiKey}`
    );

    if (!searchRes.ok) {
      console.error("[competitor/route] Maps API error:", searchRes.status);
      return NextResponse.json({ error: "Failed to fetch competitor data" }, { status: 502 });
    }

    const searchData = await searchRes.json();
    const places = (searchData.results ?? []).slice(0, 10);

    const competitors = places.map((p: { name: string; rating: number; user_ratings_total: number; place_id: string }) => ({
      name: p.name,
      rating: p.rating,
      reviewCount: p.user_ratings_total,
      placeId: p.place_id,
    }));

    const { generateContent } = await import("@/lib/claude");
    const insights = await generateContent(
      `以下の競合データを分析して、Mys美容室への具体的な改善提案を3つ出してください:\n${JSON.stringify(competitors, null, 2)}`
    );

    return NextResponse.json({ competitors, insights });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
    }
    console.error("[competitor/route]", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Failed to fetch competitor data" }, { status: 500 });
  }
}
