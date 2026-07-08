import { NextResponse } from "next/server";
import { syncVaultIndex, syncVaultIndexFull } from "@/lib/obsidian/rag";
import { verifyRouterSecret } from "@/lib/router/notify";

export const maxDuration = 300;

// RAG インデックス同期（GitHub Actions: 毎日深夜 / 手動実行も可）
// 差分のみ埋め込み。ノート数が多い初回は数回呼べば全件到達する（1回最大100件）
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const cronOk = !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
  if (!cronOk && !verifyRouterSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  // ?full=1 で remaining=0 まで実行予算内で繰り返す（初回インデックス用）
  const result = searchParams.get("full")
    ? await syncVaultIndexFull()
    : await syncVaultIndex(100);
  return NextResponse.json(result);
}

export async function GET(req: Request) {
  return POST(req);
}
