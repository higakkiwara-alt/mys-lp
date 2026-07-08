import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPolicy } from "@/lib/router/config";
import { isVaultConfigured, readNote } from "@/lib/obsidian/vault";
import { verifyRouterSecret, isSameOriginRequest } from "@/lib/router/notify";
import { CEO_PRINCIPLES_PATH } from "@/prompts/ceo-principles";

export const maxDuration = 60;

// 本番運用前チェック（実運用フェーズ手順1）。デプロイ後にこれを1回叩けば
// 「本番運用できる状態か」を ok / warn / fail の一覧で確認できる
export async function GET(req: Request) {
  if (!verifyRouterSecret(req) && !isSameOriginRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const checks: Array<{ name: string; status: "ok" | "warn" | "fail"; detail: string }> = [];
  const env = (name: string, required: boolean, note: string) => {
    const set = !!process.env[name];
    checks.push({
      name: `env:${name}`,
      status: set ? "ok" : required ? "fail" : "warn",
      detail: set ? "設定済み" : `未設定 — ${note}`,
    });
    return set;
  };

  // 環境変数
  env("ANTHROPIC_API_KEY", true, "AI実行に必須");
  env("DATABASE_URL", true, "実行ログ・承認キューに必須");
  env("ROUTER_WEBHOOK_SECRET", true, "n8n/LINE連携・承認コマンドに必須");
  env("N8N_REPORT_WEBHOOK_URL", false, "未設定だと完了/承認待ちのLINE通知が飛ばない");
  env("OBSIDIAN_VAULT_REPO", false, "未設定だとObsidian保存・参照がスキップされる");
  env("OBSIDIAN_VAULT_TOKEN", false, "同上");
  env("OPENAI_API_KEY", false, "未設定だとRAGが使えず従来検索にフォールバック / 音声文字起こし不可");
  env("CRON_SECRET", false, "未設定だとGitHub Actions（tick/週次/索引）が動かない");
  const publishSet = !!process.env.N8N_PUBLISH_WEBHOOK_URL;
  checks.push({
    name: "env:N8N_PUBLISH_WEBHOOK_URL",
    status: publishSet ? "warn" : "ok",
    detail: publishSet
      ? "設定されています — 実運用フェーズでは未設定（承認済み下書きまで）がオーナー方針"
      : "未設定（オーナー方針どおり: 自動投稿なし・承認済み下書きまで）",
  });

  // DB 接続・テーブル
  try {
    const [runs, index, memories] = await Promise.all([
      prisma.routerRun.count(),
      prisma.vaultIndex.count(),
      prisma.ceoMemory.count(),
    ]);
    checks.push({ name: "db:connection", status: "ok", detail: `RouterRun ${runs}件` });
    checks.push({
      name: "rag:index",
      status: index > 0 ? "ok" : "warn",
      detail: index > 0 ? `${index} ノートをインデックス済み` : "空 — /api/router/vault-index?full=1 を実行してください",
    });
    checks.push({ name: "ceo-memory", status: "ok", detail: `${memories} 件の判断を記録済み` });
  } catch (e) {
    checks.push({ name: "db:connection", status: "fail", detail: `接続失敗: ${e instanceof Error ? e.message : e}（npm run db:push 済みか確認）` });
  }

  // Vault 接続 + シード確認
  if (isVaultConfigured()) {
    const principles = await readNote(CEO_PRINCIPLES_PATH);
    checks.push({
      name: "vault:ceo-principles",
      status: principles ? "ok" : "warn",
      detail: principles
        ? "CEO Principles 到達可能（ピン留め参照OK）"
        : "見つからない — /api/router/seed を実行してください",
    });
  } else {
    checks.push({ name: "vault:connection", status: "warn", detail: "Vault未設定" });
  }

  // ポリシー
  const policy = await getPolicy();
  checks.push({
    name: "policy",
    status: "ok",
    detail: `Fable: complexity>=${policy.fableComplexityThreshold}・$${policy.fableDailyLimitUsd}/日 / 承認: 発信必須・$${policy.approvalCostThresholdUsd}超 / 動画: ${policy.videoDailyLimit}本/日`,
  });

  const overall = checks.some((c) => c.status === "fail")
    ? "fail"
    : checks.some((c) => c.status === "warn")
      ? "warn"
      : "ok";

  return NextResponse.json({ overall, checks, policy });
}
