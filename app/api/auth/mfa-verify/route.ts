import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  makeSessionCookie,
  clearPreAuthCookie,
  requirePreAuth,
} from "@/lib/auth";
import { auditLog, clearLoginFailures } from "@/lib/audit";
import { verifyTotp } from "@/lib/totp";

const schema = z.object({
  code: z.string().regex(/^\d{6}$/, "TOTP code must be 6 digits"),
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

  // Require valid pre-auth cookie (password already verified, MFA pending)
  const preAuthError = requirePreAuth(req);
  if (preAuthError) return preAuthError;

  try {
    const body = await req.json();
    const { code } = schema.parse(body);

    const secret = process.env.TOTP_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "MFA not configured" }, { status: 500 });
    }

    if (!verifyTotp(secret, code)) {
      auditLog("mfa_failure", ip);
      // Constant delay to prevent timing oracle on TOTP
      await new Promise((r) => setTimeout(r, 500));
      return NextResponse.json({ error: "Invalid MFA code" }, { status: 401 });
    }

    auditLog("mfa_success", ip);
    clearLoginFailures(ip);

    const token = createSessionToken();
    const sessionCookie = makeSessionCookie(token);
    // Clear the pre-auth cookie now that we've upgraded to a full session
    const clearPreAuth = clearPreAuthCookie();

    const redirect = req.nextUrl.searchParams.get("redirect") ?? "/dashboard";
    const safePath =
      redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/dashboard";

    return NextResponse.json(
      { success: true, redirect: safePath },
      {
        headers: [
          ["Set-Cookie", sessionCookie],
          ["Set-Cookie", clearPreAuth],
        ] as unknown as HeadersInit,
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
