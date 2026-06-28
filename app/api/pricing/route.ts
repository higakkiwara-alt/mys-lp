import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/claude";

const MOCK_SLOTS = [
  { menu: "縮毛矯正", dayLabel: "月曜", hour: 10, fillRate: 0.32, basePrice: 28000, suggestPrice: 24000 },
  { menu: "縮毛矯正", dayLabel: "火曜", hour: 14, fillRate: 0.28, basePrice: 28000, suggestPrice: 22000 },
  { menu: "カラー", dayLabel: "水曜", hour: 11, fillRate: 0.95, basePrice: 12000, suggestPrice: 14000 },
  { menu: "カラー", dayLabel: "土曜", hour: 13, fillRate: 0.98, basePrice: 12000, suggestPrice: 15000 },
  { menu: "カット", dayLabel: "平日午前", hour: 9, fillRate: 0.41, basePrice: 6600, suggestPrice: 5500 },
  { menu: "トリートメント", dayLabel: "木曜", hour: 15, fillRate: 0.55, basePrice: 8800, suggestPrice: 8800 },
];

const MONTHLY_STATS = [
  { month: "1月", revenue: 1820000, bookings: 187 },
  { month: "2月", revenue: 1640000, bookings: 162 },
  { month: "3月", revenue: 2120000, bookings: 218 },
  { month: "4月", revenue: 1980000, bookings: 201 },
  { month: "5月", revenue: 2240000, bookings: 229 },
  { month: "6月", revenue: 2180000, bookings: 213 },
];

export async function GET() {
  return NextResponse.json({
    slots: MOCK_SLOTS,
    monthlyStats: MONTHLY_STATS,
    summary: {
      avgFillRate: 0.58,
      potentialRevenue: 180000,
      lowFillSlots: MOCK_SLOTS.filter((s) => s.fillRate < 0.5).length,
      highDemandSlots: MOCK_SLOTS.filter((s) => s.fillRate > 0.9).length,
    },
  });
}

export async function POST(req: NextRequest) {
  const { action } = await req.json();

  if (action === "analyze") {
    const lowSlots = MOCK_SLOTS.filter((s) => s.fillRate < 0.5);
    const highSlots = MOCK_SLOTS.filter((s) => s.fillRate > 0.9);
    const prompt = `美容室の価格最適化提案。
低稼働スロット: ${lowSlots.map((s) => `${s.dayLabel}${s.hour}時 ${s.menu}（充填率${Math.round(s.fillRate * 100)}%）`).join(", ")}
高需要スロット: ${highSlots.map((s) => `${s.dayLabel}${s.hour}時 ${s.menu}（充填率${Math.round(s.fillRate * 100)}%）`).join(", ")}
具体的な価格戦略と集客施策を3つ提案してください。`;
    const analysis = await generateContent(prompt);
    return NextResponse.json({ analysis, slots: MOCK_SLOTS });
  }

  if (action === "campaign") {
    const { slot } = await req.json().catch(() => ({ slot: null }));
    if (!slot) return NextResponse.json({ error: "slot required" }, { status: 400 });
    const message = await generateContent(
      `美容室Mys限定クーポンのLINEメッセージ(150字以内): ${slot.dayLabel}の${slot.menu}が${slot.suggestPrice}円（通常${slot.basePrice}円）。`
    );
    return NextResponse.json({ message });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
