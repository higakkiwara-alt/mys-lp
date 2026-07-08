import { NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { runPipeline } from "@/lib/router/orchestrator";
import { verifyRouterSecret, isSameOriginRequest } from "@/lib/router/notify";
import { recordOutcome } from "@/lib/router/ceo-memory";

export const maxDuration = 300;

const ApproveSchema = z.object({
  action: z.enum(["approve", "reject", "retry", "outcome"]),
  note: z.string().max(4000).optional(), // reject: 修正指示 / outcome: 判断の結果
  by: z.string().default("owner"),
});

// 承認キュー操作（LINE「承認 <runId>」→ n8n WF-0 / Dashboard 承認ボタン → 同一オリジン）
// - approve: 承認して続行（publish 等へ進む）
// - reject : note があれば修正指示として最初から再生成、なければ中止
// - retry  : エラー実行の再実行
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyRouterSecret(req) && !isSameOriginRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = ApproveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const { action, note, by } = parsed.data;

  const run = await prisma.routerRun.findUnique({ where: { id } });
  if (!run) return NextResponse.json({ error: "not found", output: "該当の実行が見つかりません" }, { status: 404 });

  // CEO Memory: 判断の結果を記録（「結果 <runId> ...」）
  if (action === "outcome") {
    if (!note?.trim()) return NextResponse.json({ output: "結果の内容を書いてください（例: 結果 <runId> 出店を実行し3ヶ月で黒字化）" });
    const output = await recordOutcome(id, note.trim());
    return NextResponse.json({ output });
  }

  if (action === "approve") {
    if (run.status !== "waiting_approval") {
      return NextResponse.json({ output: `この実行は承認待ちではありません（状態: ${run.status}）` });
    }
    await prisma.routerRun.update({
      where: { id },
      data: { approvedAt: new Date(), approvedBy: by, feedback: null },
    });
    after(() => runPipeline(id));
    return NextResponse.json({ output: `✅ 承認しました「${run.title ?? ""}」。続きを実行し、完了時に通知します。` });
  }

  if (action === "reject") {
    if (note && note.trim()) {
      // 修正指示つき却下 → 最初から再生成（feedback を全生成ステップに注入）
      await prisma.routerRun.update({
        where: { id },
        data: { status: "queued", currentStep: 0, approvedAt: null, approvedBy: null, feedback: note },
      });
      after(() => runPipeline(id));
      return NextResponse.json({ output: `🔁 修正指示を反映して作り直します「${run.title ?? ""}」。完了時に通知します。` });
    }
    await prisma.routerRun.update({ where: { id }, data: { status: "rejected" } });
    return NextResponse.json({ output: `🛑 中止しました「${run.title ?? ""}」。下書きは実行ログに残っています。` });
  }

  // retry: エラー実行の再開（currentStep から）
  if (run.status !== "error") {
    return NextResponse.json({ output: `この実行はエラー状態ではありません（状態: ${run.status}）` });
  }
  await prisma.routerRun.update({ where: { id }, data: { status: "queued", error: null } });
  after(() => runPipeline(id));
  return NextResponse.json({ output: `🔁 再実行します「${run.title ?? ""}」。完了時に通知します。` });
}
