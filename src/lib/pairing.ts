// Cryptographically secure pairing helpers.

/**
 * Generate a 6-digit PIN using crypto.getRandomValues with rejection sampling
 * to avoid modulo bias across the [100000, 999999] range.
 */
export function generateSecurePin(): string {
  const range = 900_000; // 100000..999999 inclusive
  // Largest multiple of `range` that fits in a Uint32 — used to reject biased samples.
  const limit = Math.floor(0xffffffff / range) * range;
  const buf = new Uint32Array(1);
  // Loop is bounded in practice (>99.99% acceptance on first try).
  // eslint-disable-next-line no-constant-condition
  while (true) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) {
      return (100_000 + (buf[0] % range)).toString();
    }
  }
}

/**
 * Generate a short, human-typeable shared secret (4 chars from a 32-char
 * unambiguous alphabet — ~20 bits of entropy). Combined with the 6-digit PIN
 * (~20 bits), total search space is ~40 bits, defeating PIN-only enumeration.
 * The QR code carries both so the typical user never types this manually.
 */
const SECRET_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789X"; // 32 chars, no 0/O/1/I/L
export function generateSharedSecret(): string {
  const len = 4;
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  // Power-of-two alphabet (32) — masking is unbiased.
  let out = "";
  for (let i = 0; i < len; i++) {
    out += SECRET_ALPHABET[buf[i] & 0x1f];
  }
  return out;
}

/** Normalize user-typed secret: uppercase, strip non-alphanumerics, max 4 chars. */
export function normalizeSecret(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

/** Constant-time string comparison to prevent timing attacks. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Encode pairing payload for QR. Format: "PIN.SECRET". */
export function encodePairingPayload(pin: string, secret: string): string {
  return `${pin}.${secret}`;
}

/** Parse a QR payload. Returns null for plain PIN-only inputs. */
export function parsePairingPayload(raw: string): { pin: string; secret: string | null } {
  const trimmed = raw.trim();
  const dot = trimmed.indexOf(".");
  if (dot === -1) {
    const pin = trimmed.replace(/\D/g, "").slice(0, 6);
    return { pin, secret: null };
  }
  const pin = trimmed.slice(0, dot).replace(/\D/g, "").slice(0, 6);
  const secret = trimmed.slice(dot + 1).slice(0, 64);
  return { pin, secret: secret || null };
}
