/**
 * Next.js Instrumentation — runs once on server startup (Node.js runtime only)
 * Fail-fast validation of required environment variables.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const REQUIRED: string[] = ["AUTH_SECRET", "ADMIN_PASSWORD"];
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `[startup] Missing required environment variables: ${missing.join(", ")}. ` +
        "Copy .env.local.example to .env.local and fill in the values."
    );
  }

  const secret = process.env.AUTH_SECRET!;
  if (secret.length < 32) {
    throw new Error("[startup] AUTH_SECRET must be at least 32 characters (use 64-char hex).");
  }

  const OPTIONAL_SECURITY: string[] = [
    "TOTP_SECRET",
    "CRON_SECRET",
    "META_APP_SECRET",
    "LINE_CHANNEL_SECRET",
    "INSTAGRAM_VERIFY_TOKEN",
  ];
  const missing2 = OPTIONAL_SECURITY.filter((k) => !process.env[k]);
  if (missing2.length > 0) {
    console.warn(
      `[security] Optional security vars not set (webhooks/MFA/cron will reject all requests): ${missing2.join(", ")}`
    );
  }
}
