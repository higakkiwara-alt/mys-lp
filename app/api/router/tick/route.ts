import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runPipeline } from "@/lib/router/orchestrator";
import { verifyRouterSecret } from "@/lib/router/notify";

export const maxDuration = 300;

// ジョブキュー処理（GitHub Actions cron から5分毎に呼ばれる）
// 対象:
//  - status=queued で plan があり、2分以上更新がない実行（after() が完了しなかった/予算超過で中断した続き）
//  - status=running で 8分以上更新がない実行（クラッシュ・タイムアウトの復旧）
// 楽観ロック（updateMany の条件付き更新）で二重実行を防止する
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const cronOk = !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
  if (!cronOk && !verifyRouterSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const TOTAL_BUDGET_MS = 250_000;
  const processed: Array<{ runId: string; claimed: string }> = [];

  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
  const eightMinAgo = new Date(Date.now() - 8 * 60 * 1000);

  const candidates = await prisma.routerRun.findMany({
    where: {
      plan: { not: undefined },
      OR: [
        { status: "queued", updatedAt: { lt: twoMinAgo } },
        { status: "running", updatedAt: { lt: eightMinAgo } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 5,
    select: { id: true, status: true },
  });

  for (const c of candidates) {
    const remaining = TOTAL_BUDGET_MS - (Date.now() - started);
    if (remaining < 30_000) break;

    // 楽観的クレーム: 状態が変わっていたら他プロセスが処理中なのでスキップ
    const claimed = await prisma.routerRun.updateMany({
      where: { id: c.id, status: c.status },
      data: { status: "queued" },
    });
    if (claimed.count === 0) continue;

    await runPipeline(c.id, { budgetMs: remaining - 10_000 });
    processed.push({ runId: c.id, claimed: c.status });
  }

  return NextResponse.json({ processed, candidates: candidates.length });
}

export async function GET(req: Request) {
  return POST(req);
}
