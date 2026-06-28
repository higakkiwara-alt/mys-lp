import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateTotpSecret, getTotpUri } from "@/lib/totp";
import { auditLog } from "@/lib/audit";

const ISSUER = "Mys Admin";
const ACCOUNT = "admin";

/**
 * GET  — returns a new TOTP secret + otpauth URI for QR code display.
 *         The secret is NOT yet active; the operator must set TOTP_SECRET
 *         in their environment after scanning and verifying the code.
 *
 * This endpoint is intentionally read-only: it cannot activate MFA by itself
 * because environment variables must be set out-of-band (Vercel dashboard /
 * .env.local). This prevents accidental MFA lockout and keeps the secret
 * server-side only.
 */
export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  // If MFA is already active, return the existing URI (no new secret)
  const existingSecret = process.env.TOTP_SECRET;
  if (existingSecret) {
    const uri = getTotpUri(ISSUER, ACCOUNT, existingSecret);
    auditLog("mfa_setup", "server", "existing secret returned");
    return NextResponse.json({ active: true, uri });
  }

  // Generate a new secret for the operator to configure
  const secret = generateTotpSecret();
  const uri = getTotpUri(ISSUER, ACCOUNT, secret);

  auditLog("mfa_setup", "server", "new secret generated");

  return NextResponse.json({
    active: false,
    secret,
    uri,
    instructions:
      "1. Scan the QR code (or enter the secret) in your authenticator app. " +
      "2. Set TOTP_SECRET=<secret> in your environment. " +
      "3. Redeploy / restart the server. " +
      "4. Verify with POST /api/auth/mfa-verify.",
  });
}
