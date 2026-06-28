import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/claude";
import crypto from "crypto";

function verifyLineSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;

  // Fail-closed: if secret is not configured, reject ALL requests
  if (!secret) return false;

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
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  if (!verifyLineSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const events = (body.events as Array<Record<string, unknown>>) ?? [];

  for (const event of events) {
    if (event.type !== "message") continue;
    const msgData = event.message as Record<string, unknown> | undefined;
    if (msgData?.type !== "text") continue;

    const rawText = String(msgData.text ?? "");
    const userMessage = rawText.slice(0, 500); // Limit input length
    const replyToken = String(event.replyToken ?? "");

    if (!replyToken) continue;

    // Sanitize user input to prevent prompt injection
    const sanitized = userMessage.replace(/[<>]/g, "").trim();

    const reply = await generateContent(
      `お客様からのメッセージ: ${sanitized}`,
      "あなたはMys（ミース）立川の美容室LINEアシスタントです。丁寧・簡潔（150字以内）に返信し、予約を促してください。定休日:火曜日。サロン以外の話題（政治・宗教・個人情報等）には応答しないでください。"
    );

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
