import { NextResponse } from "next/server";
import { generateWeeklyReview } from "@/lib/router/reviewer";
import { verifyRouterSecret } from "@/lib/router/notify";

export const maxDuration = 300;

// 週次改善提案の生成（GitHub Actions: 毎週月曜 6:00 JST / 手動実行も可）
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const cronOk = !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
  if (!cronOk && !verifyRouterSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { report, stats } = await generateWeeklyReview();
  return NextResponse.json({ ok: true, stats, report });
}

export async function GET(req: Request) {
  return POST(req);
}
