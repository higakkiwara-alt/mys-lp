import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// In-memory rate limiter (per edge instance)
// For production at scale, replace with Vercel KV / Upstash Redis
// ---------------------------------------------------------------------------
const rlMap = new Map<string, { count: number; resetAt: number }>();
let lastCleanup = 0;

function checkRate(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  // Prune expired entries periodically to prevent unbounded memory growth
  if (now - lastCleanup > 60_000) {
    lastCleanup = now;
    for (const [k, v] of rlMap) {
      if (v.resetAt < now) rlMap.delete(k);
    }
  }

  const entry = rlMap.get(key);
  if (!entry || entry.resetAt < now) {
    rlMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------
const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "0", // Disabled in favor of CSP
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
};

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js hydration requires these
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const HSTS = "max-age=63072000; includeSubDomains; preload";

// ---------------------------------------------------------------------------
// Session check (Edge-compatible via Web Crypto)
// ---------------------------------------------------------------------------
async function verifySessionEdge(token: string): Promise<boolean> {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !token) return false;

  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return false;

  const payload = token.slice(0, dotIndex);
  const sigHex = token.slice(dotIndex + 1);

  try {
    const keyData = new TextEncoder().encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const expected = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(payload)
    );

    // Convert hex signature to bytes for comparison
    if (sigHex.length !== 64) return false;
    const sigBytes = new Uint8Array(
      sigHex.match(/.{2}/g)!.map((b) => parseInt(b, 16))
    );
    const expectedBytes = new Uint8Array(expected);

    // Constant-time comparison
    if (sigBytes.length !== expectedBytes.length) return false;
    let diff = 0;
    for (let i = 0; i < sigBytes.length; i++) diff |= sigBytes[i] ^ expectedBytes[i];
    if (diff !== 0) return false;

    // Check expiry
    const data = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Routes that have their own auth (webhooks) or no auth needed (public)
// ---------------------------------------------------------------------------
const PUBLIC_ROUTES = ["/login", "/api/auth/", "/api/webhooks/"];
const CRON_ROUTES = ["/api/digest", "/api/meo/dominator", "/api/retention"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
}

function isCronRoute(pathname: string): boolean {
  return CRON_ROUTES.some((r) => pathname.startsWith(r));
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip Next.js static assets
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(jpg|jpeg|png|gif|svg|ico|webp|woff2?|ttf)$/)
  ) {
    return NextResponse.next();
  }

  // HTTP → HTTPS redirect in production
  if (
    process.env.NODE_ENV === "production" &&
    req.headers.get("x-forwarded-proto") === "http"
  ) {
    const httpsUrl = new URL(req.url);
    httpsUrl.protocol = "https:";
    return NextResponse.redirect(httpsUrl, 301);
  }

  const ip = getIp(req);

  // ----- Rate limiting -----
  if (pathname.startsWith("/api/")) {
    const isWebhook = pathname.startsWith("/api/webhooks/");
    const isAiRoute = /^\/api\/(brain|content|image|competitor|digest|recruit|sales|saas|seo|stylist|training|meo|reviews|pricing|schedule|retention)/.test(pathname);

    const bucket = isWebhook ? "wh" : isAiRoute ? "ai" : "api";
    const limit = isWebhook ? 300 : isAiRoute ? 20 : 60;

    if (!checkRate(`${ip}:${bucket}`, limit, 60_000)) {
      const res = new NextResponse(
        JSON.stringify({ error: "Rate limit exceeded. Retry in 60 seconds." }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } }
      );
      return addSecurityHeaders(res, false);
    }
  }

  // ----- Auth: Public routes skip -----
  const isPublic = isPublicRoute(pathname);

  // ----- Auth: Cron routes check -----
  if (isCronRoute(pathname)) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${cronSecret}`) {
        const res = new NextResponse(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
        return addSecurityHeaders(res, false);
      }
    }
    // Cron routes don't need cookie-based session auth
    const res = NextResponse.next();
    return addSecurityHeaders(res, true);
  }

  // ----- Auth: API routes (non-public, non-cron) -----
  if (pathname.startsWith("/api/") && !isPublic) {
    const token = req.cookies.get("mys_session")?.value ?? "";
    const valid = await verifySessionEdge(token);
    if (!valid) {
      const res = new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
      return addSecurityHeaders(res, false);
    }
  }

  // ----- Auth: Dashboard routes -----
  if ((pathname.startsWith("/dashboard") || pathname.startsWith("/ai-os")) && !isPublic) {
    const token = req.cookies.get("mys_session")?.value ?? "";
    const valid = await verifySessionEdge(token);
    if (!valid) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const res = NextResponse.next();
  return addSecurityHeaders(res, true);
}

function addSecurityHeaders(res: NextResponse, addCsp: boolean): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  if (addCsp) res.headers.set("Content-Security-Policy", CSP);
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", HSTS);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
