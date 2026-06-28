import crypto from "crypto";

// RFC 6238 TOTP implementation (no external dependencies)

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(encoded: string): Buffer {
  const clean = encoded.toUpperCase().replace(/[= \t\r\n]/g, "");
  const outputLength = Math.floor((clean.length * 5) / 8);
  const output = Buffer.alloc(outputLength);
  let bits = 0;
  let value = 0;
  let index = 0;

  for (const char of clean) {
    const charValue = BASE32_ALPHABET.indexOf(char);
    if (charValue === -1) throw new Error(`Invalid base32 character: ${char}`);
    value = (value << 5) | charValue;
    bits += 5;
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }
  return output;
}

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function hotp(secretBytes: Buffer, counter: number): string {
  const counterBuf = Buffer.alloc(8);
  // Write as big-endian uint64
  const big = BigInt(counter);
  counterBuf.writeBigUInt64BE(big);

  const hmac = crypto.createHmac("sha1", secretBytes).update(counterBuf).digest();
  const offset = hmac[19] & 0x0f;
  const code =
    (((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)) %
    1_000_000;

  return code.toString().padStart(6, "0");
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function verifyTotp(secret: string, token: string): boolean {
  if (!/^\d{6}$/.test(token.trim())) return false;

  let secretBytes: Buffer;
  try {
    secretBytes = base32Decode(secret);
  } catch {
    return false;
  }

  const counter = Math.floor(Date.now() / 30_000);

  // Allow ±1 window (30s drift tolerance)
  for (const drift of [-1, 0, 1]) {
    const expected = hotp(secretBytes, counter + drift);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token.trim()))) {
      return true;
    }
  }
  return false;
}

export function getTotpUri(issuer: string, account: string, secret: string): string {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?${params}`;
}
