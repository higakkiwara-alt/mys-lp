import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/claude";
import { verifyCronSecret } from "@/lib/auth";
import { z } from "zod";

const MOCK_CUSTOMERS = [
  { id: "1", name: "山田 花子", lastVisit: "2024-03-15", daysSince: 107, visitCount: 8, churnRisk: 0.82, segment: "high-risk" },
  { id: "2", name: "鈴木 美咲", lastVisit: "2024-05-01", daysSince: 60, visitCount: 12, churnRisk: 0.45, segment: "medium-risk" },
  { id: "3", name: "田中 由美", lastVisit: "2024-06-10", daysSince: 20, visitCount: 3, churnRisk: 0.15, segment: "low-risk" },
  { id: "4", name: "佐藤 京子", lastVisit: "2024-02-20", daysSince: 131, visitCount: 15, churnRisk: 0.91, segment: "high-risk" },
  { id: "5", name: "伊藤 智子", lastVisit: "2024-04-25", daysSince: 66, visitCount: 6, churnRisk: 0.58, segment: "medium-risk" },
];

const actionSchema = z.object({
  action: z.enum(["generate-message", "bulk-campaign"]),
  customerId: z.string().max(50).optional(),
  customerName: z.string().max(50).optional(),
  daysSince: z.number().int().min(0).max(3650).optional(),
  visitCount: z.number().int().min(0).max(9999).optional(),
});

export async function GET(req: NextRequest) {
  // Called by Vercel cron - requires cron secret
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  const stats = {
    totalCustomers: 248,
    highRisk: MOCK_CUSTOMERS.filter((c) => c.churnRisk >= 0.7).length,
    mediumRisk: MOCK_CUSTOMERS.filter((c) => c.churnRisk >= 0.4 && c.churnRisk < 0.7).length,
    lowRisk: MOCK_CUSTOMERS.filter((c) => c.churnRisk < 0.4).length,
    recoveredThisMonth: 7,
    retentionRate: 78.3,
  };
  return NextResponse.json({ customers: MOCK_CUSTOMERS, stats });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, customerId, customerName, daysSince, visitCount } = actionSchema.parse(body);

    if (action === "generate-message") {
      if (!customerName || daysSince === undefined || visitCount === undefined) {
        return NextResponse.json({ error: "customerName, daysSince, and visitCount are required" }, { status: 400 });
      }

      const prompt = `美容室Mys（ミース）からの再来店促進LINEメッセージを作成。お客様は${daysSince}日前にご来店（計${visitCount}回）。親しみやすく、特典情報を含む130文字以内のメッセージ。`;
      const message = await generateContent(prompt);
      return NextResponse.json({ message, customerId });
    }

    if (action === "bulk-campaign") {
      const highRisk = MOCK_CUSTOMERS.filter((c) => c.churnRisk >= 0.7);
      const messages = await Promise.all(
        highRisk.map(async (c) => {
          const msg = await generateContent(
            `美容室Mys再来店メッセージ(130字以内): ${c.daysSince}日前が最終来店、${c.visitCount}回ご来店のお客様へ。`
          );
          return { customerId: c.id, message: msg };
        })
      );
      return NextResponse.json({ messages, count: messages.length });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
    }
    console.error("[retention/route]", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
