// n8n 接続（docs/ai-router-os/06）
// - 受信: n8n → POST /api/router/intake（X-ROUTER-SECRET 検証）
// - 送信: 実行完了 → n8n webhook（→ LINE通知等へ。n8n Cloud前提・URL差し替えでセルフホスト移行可）

export function verifyRouterSecret(req: Request): boolean {
  const secret = process.env.ROUTER_WEBHOOK_SECRET;
  if (!secret) return false;
  return req.headers.get("x-router-secret") === secret;
}

export type ReportPayload = {
  runId: string;
  status: string;
  title: string;
  source: string;
  agent: string;
  model: string;
  costUsd: number;
  estimatedUsd: number | null;
  durationMs: number;
  obsidianPath: string | null;
  summary: string; // LINE等でそのまま読める短い報告
};

/** 完了報告を n8n に送る（未設定ならスキップ。失敗しても実行自体は成功扱い） */
export async function sendReport(payload: ReportPayload): Promise<void> {
  const url = process.env.N8N_REPORT_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-router-secret": process.env.ROUTER_WEBHOOK_SECRET ?? "",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("n8n report webhook failed:", e);
  }
}
