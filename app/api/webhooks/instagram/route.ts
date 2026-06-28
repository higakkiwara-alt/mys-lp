import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/claude";
import crypto from "crypto";

// Meta sends X-Hub-Signature-256: sha256=<HMAC-SHA256(body, app_secret)>
function verifyMetaSignature(rawBody: string, signatureHeader: string): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    // Fail-closed: if secret is not configured, reject all requests
    return false;
  }

  if (!signatureHeader.startsWith("sha256=")) return false;

  const receivedSig = signatureHeader.slice(7);
  const expectedSig = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  if (receivedSig.length !== expectedSig.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(receivedSig, "hex"),
    Buffer.from(expectedSig, "hex")
  );
}

// Webhook subscription verification (GET)
export async function GET(req: NextRequest) {
  const verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN;
  if (!verifyToken) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Constant-time token comparison to prevent timing attacks
  const tokenBuf = Buffer.alloc(64, 0);
  const expectedBuf = Buffer.alloc(64, 0);
  tokenBuf.write(token);
  expectedBuf.write(verifyToken);

  if (!crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return new NextResponse(challenge, { status: 200 });
}

// Webhook event processing (POST)
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";

  if (!verifyMetaSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  if (payload.object !== "instagram") {
    return NextResponse.json({ error: "Not instagram" }, { status: 400 });
  }

  const entries = (payload.entry as Array<Record<string, unknown>>) ?? [];
  let processed = 0;

  for (const entry of entries) {
    const messaging = (entry.messaging as Array<Record<string, unknown>>) ?? [];
    for (const msg of messaging) {
      const msgData = msg.message as Record<string, unknown> | undefined;
      if (msgData?.text && typeof msgData.text === "string") {
        const userMessage = msgData.text.slice(0, 500); // Limit input length
        const senderId = (msg.sender as Record<string, string> | undefined)?.id;

        if (!senderId) continue;

        // Sanitize user input to prevent prompt injection
        const sanitized = userMessage.replace(/[<>]/g, "").trim();

        const reply = await generateContent(
          `お客様からのメッセージ: ${sanitized}`,
          "あなたはMys（ミース）立川の美容室AIアシスタントです。Instagram DMに丁寧かつ簡潔に返信してください。150字以内。予約は「ホットペッパービューティー」か「LINE」を案内。サロン以外の話題（政治・宗教・個人情報等）には応答しないでください。"
        );

        const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        if (accessToken) {
          await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              recipient: { id: senderId },
              message: { text: reply },
            }),
          });
        }

        processed++;
      }
    }
  }

  return NextResponse.json({ status: "ok", processed });
}
