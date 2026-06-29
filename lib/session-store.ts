/**
 * Server-side session revocation store (Node.js runtime only)
 *
 * Adds a JTI (JWT ID) blacklist so sessions can be immediately invalidated
 * on logout or forced-logout, even before their 7-day TTL expires.
 *
 * Architecture note:
 *   The Edge middleware cannot reach this store (different runtime).
 *   Route handlers that call requireAuth() enforce revocation at the
 *   API level. The middleware still validates signature + expiry as the
 *   first gate; this is defense-in-depth at the data layer.
 *
 *   For cross-edge enforcement in high-security environments, replace
 *   this with Vercel KV / Upstash Redis.
 */

const MAX_REVOKED_ENTRIES = 500;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// jti → expiry timestamp (we purge once the token would have expired anyway)
const revokedJtis = new Map<string, number>();

export function revokeSession(jti: string, ttlMs = SESSION_TTL_MS): void {
  if (revokedJtis.size >= MAX_REVOKED_ENTRIES) {
    // Evict oldest entry to prevent unbounded growth
    const firstKey = revokedJtis.keys().next().value;
    if (firstKey !== undefined) revokedJtis.delete(firstKey);
  }
  revokedJtis.set(jti, Date.now() + ttlMs);
}

export function isSessionRevoked(jti: string): boolean {
  const exp = revokedJtis.get(jti);
  if (exp === undefined) return false;
  if (exp < Date.now()) {
    revokedJtis.delete(jti); // lazily evict expired entries
    return false;
  }
  return true;
}

export function revokedCount(): number {
  return revokedJtis.size;
}
