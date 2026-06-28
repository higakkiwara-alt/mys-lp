import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/claude";

const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN ?? "mys_webhook_token";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.object !== "instagram") {
    return NextResponse.json({ error: "Not instagram" }, { status: 400 });
  }

  const entries = body.entry ?? [];
  const responses: unknown[] = [];

  for (const entry of entries) {
    for (const messaging of entry.messaging ?? []) {
      if (messaging.message?.text) {
        const userMessage = messaging.message.text;
        const senderId = messaging.sender?.id;

        const reply = await generateContent(
          userMessage,
          "あなたはMys（ミース）立川の美容室AIアシスタント。Instagram DMに丁寧かつ簡潔に返信。150字以内。予約は「ホットペッパービューティー」か「LINE」を案内。"
        );

        if (process.env.INSTAGRAM_ACCESS_TOKEN) {
          await fetch(
            `https://graph.facebook.com/v17.0/me/messages?access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recipient: { id: senderId },
                message: { text: reply },
              }),
            }
          );
        }
        responses.push({ senderId, reply });
      }
    }
  }

  return NextResponse.json({ status: "ok", processed: responses.length });
}
