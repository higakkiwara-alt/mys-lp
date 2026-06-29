import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/claude";
import { buildSafePrompt, sanitizeAiOutput } from "@/lib/ai-security";
import { isWebhookReplay } from "@/lib/replay-guard";
import { auditLog } from "@/lib/audit";
import crypto from "crypto";

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

// Meta sends X-Hub-Signature-256: sha256=<HMAC-SHA256(body, app_secret)>
function verifyMetaSignature(rawBody: string, signatureHeader: string): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return false; // fail-closed

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
  const ip = getIp(req);
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";

  if (!verifyMetaSignature(rawBody, signature)) {
    auditLog("webhook_invalid_sig", ip, "instagram");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Replay prevention: Meta includes entry[].time (Unix seconds)
  // We use the signature itself as the dedup key; timestamp extracted below.
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

  // Extract the earliest entry timestamp (seconds → ms)
  const firstTs = typeof (entries[0]?.time) === "number"
    ? (entries[0].time as number) * 1000
    : 0;

  if (isWebhookReplay(signature, firstTs)) {
    auditLog("webhook_invalid_sig", ip, "instagram_replay");
    return NextResponse.json({ error: "Replay detected" }, { status: 400 });
  }

  let processed = 0;

  for (const entry of entries) {
    const messaging = (entry.messaging as Array<Record<string, unknown>>) ?? [];
    for (const msg of messaging) {
      const msgData = msg.message as Record<string, unknown> | undefined;
      if (msgData?.text && typeof msgData.text === "string") {
        const senderId = (msg.sender as Record<string, string> | undefined)?.id;
        if (!senderId) continue;

        // Build injection-resistant prompt
        const prompt = buildSafePrompt(
          "Instagramのお客様DMに対して美容室として返信してください。",
          msgData.text,
          "150字以内で丁寧に返信してください。予約はホットペッパービューティーかLINEを案内。"
        );

        const raw = await generateContent(
          prompt,
          "あなたはMys（ミース）立川の美容室AIアシスタントです。サロンに関係しない話題・政治・宗教・個人情報の要求には応答しないでください。"
        );

        const reply = sanitizeAiOutput(raw).slice(0, 300);

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
