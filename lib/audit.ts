// Audit log — security events for compliance and incident response
// Production: replace the in-memory store with Supabase insert or external SIEM

export type AuditEventType =
  | "login_success"
  | "login_failure"
  | "login_locked"
  | "mfa_success"
  | "mfa_failure"
  | "mfa_setup"
  | "logout"
  | "rate_limited"
  | "webhook_invalid_sig"
  | "cron_unauthorized"
  | "api_unauthorized";

type AuditEntry = {
  ts: number;
  type: AuditEventType;
  ip: string;
  detail?: string;
};

const MAX_ENTRIES = 1000;
const LOG: AuditEntry[] = [];

export function auditLog(type: AuditEventType, ip: string, detail?: string): void {
  const entry: AuditEntry = { ts: Date.now(), type, ip, detail };

  // Keep ring buffer in memory
  if (LOG.length >= MAX_ENTRIES) LOG.shift();
  LOG.push(entry);

  // Structured log to stdout (Vercel captures this in Log Drains)
  const level = ["login_failure", "login_locked", "webhook_invalid_sig", "cron_unauthorized", "api_unauthorized", "mfa_failure"].includes(type)
    ? "WARN"
    : "INFO";

  // Do NOT include detail in production logs if it may contain user data
  console.log(
    JSON.stringify({
      level,
      audit: true,
      type,
      ip: redactIp(ip),
      ts: new Date(entry.ts).toISOString(),
    })
  );
}

export function getRecentAuditLog(limit = 100): AuditEntry[] {
  return LOG.slice(-Math.min(limit, MAX_ENTRIES)).reverse();
}

// Partially redact IP for GDPR compliance in logs
function redactIp(ip: string): string {
  if (ip === "unknown") return ip;
  const v4 = ip.match(/^(\d+\.\d+\.\d+)\.\d+$/);
  if (v4) return `${v4[1]}.xxx`;
  const v6 = ip.match(/^([0-9a-f:]+:)[0-9a-f:]+$/i);
  if (v6) return `${v6[1]}xxxx`;
  return "redacted";
}

// Track failed login attempts per IP for lockout
const FAILED_LOGINS = new Map<string, { count: number; lockedUntil: number }>();
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export function recordLoginFailure(ip: string): boolean {
  const now = Date.now();
  const entry = FAILED_LOGINS.get(ip);

  if (!entry || entry.lockedUntil < now) {
    FAILED_LOGINS.set(ip, { count: 1, lockedUntil: now + LOCKOUT_MS });
    return false;
  }

  entry.count++;
  if (entry.count >= MAX_FAILURES) {
    entry.lockedUntil = now + LOCKOUT_MS;
    return true; // locked
  }
  return false;
}

export function isLoginLocked(ip: string): boolean {
  const entry = FAILED_LOGINS.get(ip);
  if (!entry) return false;
  return entry.lockedUntil > Date.now() && entry.count >= MAX_FAILURES;
}

export function clearLoginFailures(ip: string): void {
  FAILED_LOGINS.delete(ip);
}
