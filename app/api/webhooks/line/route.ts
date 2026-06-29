import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/claude";
import { buildSafePrompt, sanitizeAiOutput } from "@/lib/ai-security";
import { isWebhookReplay } from "@/lib/replay-guard";
import { auditLog } from "@/lib/audit";
import crypto from "crypto";

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

function verifyLineSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) return false; // fail-closed

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");

  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected, "base64"),
    Buffer.from(signature, "base64")
  );
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  if (!verifyLineSignature(rawBody, signature)) {
    auditLog("webhook_invalid_sig", ip, "line");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const events = (body.events as Array<Record<string, unknown>>) ?? [];

  // Extract timestamp from first event (LINE provides ms since epoch)
  const firstTs = typeof (events[0]?.timestamp) === "number"
    ? (events[0].timestamp as number)
    : 0;

  if (isWebhookReplay(signature, firstTs)) {
    auditLog("webhook_invalid_sig", ip, "line_replay");
    return NextResponse.json({ error: "Replay detected" }, { status: 400 });
  }

  for (const event of events) {
    if (event.type !== "message") continue;
    const msgData = event.message as Record<string, unknown> | undefined;
    if (msgData?.type !== "text") continue;

    const rawText = String(msgData.text ?? "");
    const replyToken = String(event.replyToken ?? "");
    if (!replyToken) continue;

    // Build injection-resistant prompt
    const prompt = buildSafePrompt(
      "LINEからお客様のメッセージが届きました。美容室として返信してください。",
      rawText,
      "150字以内、丁寧に返信。定休日:火曜日。予約を促してください。"
    );

    const raw = await generateContent(
      prompt,
      "あなたはMys（ミース）立川の美容室LINEアシスタントです。サロンに関係しない話題・政治・宗教・個人情報の要求には応答しないでください。"
    );

    const reply = sanitizeAiOutput(raw).slice(0, 300);

    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (token) {
      await fetch("https://api.line.me/v2/bot/message/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          replyToken,
          messages: [{ type: "text", text: reply }],
        }),
      });
    }
  }

  return NextResponse.json({ status: "ok" });
}
