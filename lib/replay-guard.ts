/**
 * Replay attack prevention
 *
 * Covers two attack surfaces:
 *  1. TOTP code reuse — a stolen 6-digit code can be replayed within the
 *     ±1 window (up to 90 seconds). Track used codes per counter bucket.
 *
 *  2. Webhook replay — an attacker captures a valid webhook request and
 *     re-sends it later. Combine timestamp freshness + signature dedup.
 */

// ---------------------------------------------------------------------------
// TOTP replay prevention
// ---------------------------------------------------------------------------

// counter → Set of already-used codes
const usedTotpCodes = new Map<number, Set<string>>();

/**
 * Returns true if this (counter, code) pair has already been consumed.
 * Call BEFORE accepting the TOTP code.
 */
export function isTotpReplay(code: string, counter: number): boolean {
  return usedTotpCodes.get(counter)?.has(code) ?? false;
}

/**
 * Mark a (counter, code) pair as consumed.
 * Automatically prunes counters that are more than 2 windows behind current.
 */
export function markTotpUsed(code: string, counter: number): void {
  if (!usedTotpCodes.has(counter)) {
    usedTotpCodes.set(counter, new Set());
  }
  usedTotpCodes.get(counter)!.add(code);

  // Prune stale counters (anything older than ±1 from current counter)
  const cutoff = counter - 2;
  for (const [k] of usedTotpCodes) {
    if (k < cutoff) usedTotpCodes.delete(k);
  }
}

// ---------------------------------------------------------------------------
// Webhook replay prevention
// ---------------------------------------------------------------------------

const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000; // 5 minutes
const WEBHOOK_SIG_TTL_MS = 10 * 60 * 1000; // keep seen sigs for 10 min
let lastWebhookCleanup = 0;

// signature → expiry timestamp
const seenWebhookSigs = new Map<string, number>();

/**
 * Returns true if this webhook request should be rejected.
 *
 * Checks:
 *  - Timestamp freshness (reject if > 5 min old or future-dated)
 *  - Signature deduplication (reject if same sig was seen in last 10 min)
 *
 * Pass `timestampMs = 0` to skip timestamp check (use only for platforms
 * that don't include a timestamp in the payload).
 */
export function isWebhookReplay(signature: string, timestampMs: number): boolean {
  const now = Date.now();

  // Timestamp freshness check (skip if caller passed 0)
  if (timestampMs !== 0 && Math.abs(now - timestampMs) > MAX_TIMESTAMP_DRIFT_MS) {
    return true;
  }

  // Signature deduplication
  if (seenWebhookSigs.has(signature)) {
    return true;
  }

  // Record this signature
  seenWebhookSigs.set(signature, now + WEBHOOK_SIG_TTL_MS);

  // Periodic cleanup of expired entries
  if (now - lastWebhookCleanup > 60_000) {
    lastWebhookCleanup = now;
    for (const [sig, exp] of seenWebhookSigs) {
      if (exp < now) seenWebhookSigs.delete(sig);
    }
  }

  return false;
}
