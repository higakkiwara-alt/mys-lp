import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { isSessionRevoked } from "@/lib/session-store";

const SESSION_COOKIE = "mys_session";
const PRE_AUTH_COOKIE = "mys_preauth"; // partial session: password OK, MFA pending
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const PRE_AUTH_TTL_MS = 5 * 60 * 1000; // 5 minutes (MFA window)

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

function signToken(payload: object, ttlMs: number): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");

  // jti (JWT ID) enables individual token revocation on logout
  const jti = crypto.randomBytes(16).toString("hex");

  const data = Buffer.from(
    JSON.stringify({ ...payload, jti, exp: Date.now() + ttlMs })
  ).toString("base64url");

  const sig = crypto.createHmac("sha256", secret).update(data).digest("hex");
  return `${data}.${sig}`;
}

function verifyToken(token: string): Record<string, unknown> | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !token) return null;

  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const data = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);
  const expected = crypto.createHmac("sha256", secret).update(data).digest("hex");

  if (expected.length !== sig.length) return null;

  try {
    if (!crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as Record<string, unknown>;
    if (typeof payload.exp !== "number" || payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

export function createSessionToken(): string {
  return signToken({ role: "admin" }, SESSION_TTL_MS);
}

export function createPreAuthToken(): string {
  return signToken({ role: "pre-auth" }, PRE_AUTH_TTL_MS);
}

export function validateSessionToken(token: string): boolean {
  const payload = verifyToken(token);
  if (payload?.role !== "admin") return false;
  // Check revocation list (defense-in-depth for immediate logout)
  const jti = payload.jti as string | undefined;
  if (jti && isSessionRevoked(jti)) return false;
  return true;
}

export function validatePreAuthToken(token: string): boolean {
  const payload = verifyToken(token);
  return payload?.role === "pre-auth";
}

/** Extract JTI from a token without full verification (for revocation on logout). */
export function extractJti(token: string): string | null {
  try {
    const dotIndex = token.lastIndexOf(".");
    if (dotIndex === -1) return null;
    const data = token.slice(0, dotIndex);
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as Record<string, unknown>;
    return typeof payload.jti === "string" ? payload.jti : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Password verification
// ---------------------------------------------------------------------------

export function verifyAdminPassword(input: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.AUTH_SECRET;
  if (!password || !secret) return false;

  const inputHash = crypto.createHmac("sha256", secret).update(input).digest();
  const passHash = crypto.createHmac("sha256", secret).update(password).digest();
  return crypto.timingSafeEqual(inputHash, passHash);
}

export function isMfaEnabled(): boolean {
  return Boolean(process.env.TOTP_SECRET);
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

function buildCookie(name: string, value: string, maxAge: number): string {
  const isProd = process.env.NODE_ENV === "production";
  return [
    `${name}=${value}`,
    `Max-Age=${maxAge}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    isProd ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function makeSessionCookie(token: string): string {
  return buildCookie(SESSION_COOKIE, token, SESSION_TTL_MS / 1000);
}

export function makePreAuthCookie(token: string): string {
  return buildCookie(PRE_AUTH_COOKIE, token, PRE_AUTH_TTL_MS / 1000);
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict`;
}

export function clearPreAuthCookie(): string {
  return `${PRE_AUTH_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict`;
}

// ---------------------------------------------------------------------------
// Route auth guards
// ---------------------------------------------------------------------------

export function requireAuthFromRequest(req: NextRequest): NextResponse | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value ?? "";
  if (!validateSessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function requireAuth(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value ?? "";
  if (!validateSessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function requirePreAuth(req: NextRequest): NextResponse | null {
  const token = req.cookies.get(PRE_AUTH_COOKIE)?.value ?? "";
  if (!validatePreAuthToken(token)) {
    return NextResponse.json({ error: "MFA session expired" }, { status: 401 });
  }
  return null;
}

/** Read the raw session token from a request (needed for revocation on logout). */
export function getSessionToken(req: NextRequest): string {
  return req.cookies.get(SESSION_COOKIE)?.value ?? "";
}

// ---------------------------------------------------------------------------
// Cron authentication
// ---------------------------------------------------------------------------

export function verifyCronSecret(req: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return null; // Skip in dev when not set

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// ---------------------------------------------------------------------------
// Cookie names exported for middleware
// ---------------------------------------------------------------------------
export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const PRE_AUTH_COOKIE_NAME = PRE_AUTH_COOKIE;
