import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, clearPreAuthCookie, extractJti, getSessionToken } from "@/lib/auth";
import { revokeSession } from "@/lib/session-store";
import { auditLog } from "@/lib/audit";

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const token = getSessionToken(req);
  const jti = extractJti(token);

  // Immediately invalidate the session server-side so the token can't be
  // replayed even if someone captured it before the cookie was cleared
  if (jti) revokeSession(jti);

  auditLog("logout", getIp(req));

  return NextResponse.json(
    { success: true },
    {
      headers: [
        ["Set-Cookie", clearSessionCookie()],
        ["Set-Cookie", clearPreAuthCookie()],
      ] as unknown as HeadersInit,
    }
  );
}
