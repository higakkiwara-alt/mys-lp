import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "mys_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createSessionToken(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");

  const payload = Buffer.from(
    JSON.stringify({ role: "admin", exp: Date.now() + SESSION_TTL_MS })
  ).toString("base64url");

  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function validateSessionToken(token: string): boolean {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !token) return false;

  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return false;

  const payload = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);

  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (expected.length !== sig.length) return false;

  try {
    if (!crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"))) {
      return false;
    }
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

export function verifyAdminPassword(input: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.AUTH_SECRET;
  if (!password || !secret) return false;

  const inputHash = crypto.createHmac("sha256", secret).update(input).digest();
  const passHash = crypto.createHmac("sha256", secret).update(password).digest();
  return crypto.timingSafeEqual(inputHash, passHash);
}

export function requireAuthFromRequest(req: NextRequest): NextResponse | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !validateSessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function requireAuth(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token || !validateSessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function makeSessionCookie(token: string): string {
  const isProd = process.env.NODE_ENV === "production";
  const maxAge = SESSION_TTL_MS / 1000;
  return [
    `${SESSION_COOKIE}=${token}`,
    `Max-Age=${maxAge}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    isProd ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict`;
}

export function verifyCronSecret(req: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return null; // Skip check if not configured (dev mode)

  const auth = req.headers.get("authorization");
  const vercelCron = req.headers.get("x-vercel-cron");

  // Allow Vercel cron or Bearer token auth
  if (vercelCron === "1" && auth === `Bearer ${cronSecret}`) return null;
  if (!vercelCron && auth === `Bearer ${cronSecret}`) return null;

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
