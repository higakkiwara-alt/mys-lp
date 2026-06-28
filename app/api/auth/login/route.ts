import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  createPreAuthToken,
  makeSessionCookie,
  makePreAuthCookie,
  verifyAdminPassword,
  isMfaEnabled,
} from "@/lib/auth";
import {
  auditLog,
  isLoginLocked,
  recordLoginFailure,
  clearLoginFailures,
} from "@/lib/audit";

const schema = z.object({
  password: z.string().min(1).max(256),
});

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  try {
    // Check brute-force lockout before doing anything else
    if (isLoginLocked(ip)) {
      auditLog("login_locked", ip);
      return NextResponse.json(
        { error: "Too many failed attempts. Try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { password } = schema.parse(body);

    if (!verifyAdminPassword(password)) {
      // Constant delay to prevent timing attacks / user enumeration
      await new Promise((r) => setTimeout(r, 500));
      const locked = recordLoginFailure(ip);
      if (locked) {
        auditLog("login_locked", ip);
        return NextResponse.json(
          { error: "Too many failed attempts. Try again later." },
          { status: 429 }
        );
      }
      auditLog("login_failure", ip);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Password correct — check if MFA is required
    if (isMfaEnabled()) {
      const preAuthToken = createPreAuthToken();
      const cookieHeader = makePreAuthCookie(preAuthToken);
      auditLog("login_success", ip, "password ok, mfa pending");
      return NextResponse.json(
        { mfaRequired: true },
        { headers: { "Set-Cookie": cookieHeader } }
      );
    }

    // No MFA — issue full session immediately
    clearLoginFailures(ip);
    auditLog("login_success", ip);
    const token = createSessionToken();
    const cookieHeader = makeSessionCookie(token);

    const redirect = req.nextUrl.searchParams.get("redirect") ?? "/dashboard";
    const safePath =
      redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/dashboard";

    return NextResponse.json(
      { success: true, redirect: safePath },
      { headers: { "Set-Cookie": cookieHeader } }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
