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
 * Generate a 128-bit shared secret as base64url. Used as a secondary credential
 * after pairing so attackers who guess/enumerate PINs cannot hijack the stream.
 */
export function generateSharedSecret(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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
