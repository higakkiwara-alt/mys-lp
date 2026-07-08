import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// 実行履歴 + コスト集計（Dashboard 用）
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [runs, todayAgg, monthAgg, byModel, weeklyReview] = await Promise.all([
    prisma.routerRun.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true, input: true, source: true, status: true, resultSummary: true,
        title: true, plan: true, currentStep: true,
        costUsd: true, estimatedUsd: true, durationMs: true, obsidianPath: true,
        error: true, createdAt: true, classification: true,
      },
    }),
    prisma.routerRun.aggregate({
      where: { createdAt: { gte: startOfDay } },
      _sum: { costUsd: true }, _count: true,
    }),
    prisma.routerRun.aggregate({
      where: { createdAt: { gte: startOfMonth } },
      _sum: { costUsd: true }, _count: true,
    }),
    prisma.routerStep.groupBy({
      by: ["model"],
      where: { createdAt: { gte: startOfMonth }, model: { not: null } },
      _sum: { costUsd: true, inputTokens: true, outputTokens: true },
      _count: true,
    }),
    prisma.routerConfig.findUnique({ where: { key: "weeklyReview" } }),
  ]);

  return NextResponse.json({
    runs,
    stats: {
      today: { count: todayAgg._count, costUsd: Number(todayAgg._sum.costUsd ?? 0) },
      month: { count: monthAgg._count, costUsd: Number(monthAgg._sum.costUsd ?? 0) },
      byModel: byModel.map((m) => ({
        model: m.model,
        calls: m._count,
        costUsd: Number(m._sum.costUsd ?? 0),
        inputTokens: m._sum.inputTokens ?? 0,
        outputTokens: m._sum.outputTokens ?? 0,
      })),
    },
    weeklyReview: weeklyReview?.value ?? null,
  });
}
