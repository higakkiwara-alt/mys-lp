import { NextResponse } from "next/server";
import { collectOpsReport, formatOpsReport } from "@/lib/router/ops-report";
import { verifyRouterSecret, isSameOriginRequest } from "@/lib/router/notify";

export const maxDuration = 60;

// 実運用レポート（次回レビュー用）: ?days=30 / ?format=md
// 処理件数・承認率・差し戻し率・平均コスト・Fable回数・RAG参照・CEO Memory・エラー
export async function GET(req: Request) {
  if (!verifyRouterSecret(req) && !isSameOriginRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const days = Math.min(Number(searchParams.get("days") ?? 30), 365);
  const report = await collectOpsReport(days);

  if (searchParams.get("format") === "md") {
    return new Response(formatOpsReport(report), {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  }
  return NextResponse.json({ report, markdown: formatOpsReport(report) });
}
