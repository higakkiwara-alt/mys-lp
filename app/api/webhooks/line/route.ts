import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/claude";
import { pushMessage, buildTextMessage } from "@/lib/line";
import crypto from "crypto";

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) return true;
  const hash = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64");
  return hash === signature;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const events = body.events ?? [];

  for (const event of events) {
    if (event.type === "message" && event.message?.type === "text") {
      const userMessage: string = event.message.text;
      const replyToken: string = event.replyToken;
      const userId: string = event.source?.userId;

      const reply = await generateContent(
        userMessage,
        "あなたはMys（ミース）立川の美容室LINEアシスタント。丁寧・簡潔（150字以内）。予約誘導。定休日:火曜日。"
      );

      if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
        await fetch("https://api.line.me/v2/bot/message/reply", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            replyToken,
            messages: [{ type: "text", text: reply }],
          }),
        });
      }

      void pushMessage;
      void buildTextMessage;
      void userId;
    }
  }

  return NextResponse.json({ status: "ok" });
}
