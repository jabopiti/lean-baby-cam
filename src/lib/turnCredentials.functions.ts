import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseStatus } from "@tanstack/react-start/server";

export type IceServersResult = {
  iceServers: RTCIceServer[];
  source: "cloudflare" | "fallback";
  error?: string;
};

const FALLBACK_STUN: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/**
 * In-memory token bucket per client IP. Lives at module scope, so it resets
 * each Worker isolate cold-start. Acceptable for cost-defense (preventing a
 * runaway loop from minting thousands of TURN credentials), but NOT a strict
 * abuse-prevention layer — a determined attacker can rotate IPs or hit cold
 * isolates. For stronger guarantees, move to Cloudflare KV or Durable Objects.
 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const rateBuckets = new Map<string, { count: number; windowStart: number }>();

export function checkRateLimit(
  clientId: string,
  now: number,
  buckets: Map<string, { count: number; windowStart: number }> = rateBuckets,
): { allowed: boolean; remaining: number } {
  const bucket = buckets.get(clientId);
  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    buckets.set(clientId, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= RATE_LIMIT_MAX,
    remaining: Math.max(0, RATE_LIMIT_MAX - bucket.count),
  };
}

/**
 * Pure, testable credential-minting logic. Caller supplies env, fetch, and a
 * client identifier (already rate-limit-checked upstream). Returns the result
 * shape verbatim; never throws.
 */
export async function mintIceServers(
  env: { tokenId?: string; apiToken?: string },
  fetchImpl: typeof fetch,
): Promise<IceServersResult> {
  if (!env.tokenId || !env.apiToken) {
    console.error("[turn] Missing CLOUDFLARE_TURN_TOKEN_ID or CLOUDFLARE_TURN_API_TOKEN");
    return {
      iceServers: FALLBACK_STUN,
      source: "fallback",
      error: "TURN credentials not configured",
    };
  }
  try {
    const res = await fetchImpl(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${env.tokenId}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: 3600 }),
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[turn] Cloudflare returned ${res.status}: ${body}`);
      return {
        iceServers: FALLBACK_STUN,
        source: "fallback",
        error: `Cloudflare TURN error ${res.status}`,
      };
    }
    const data = (await res.json()) as { iceServers?: RTCIceServer | RTCIceServer[] };
    const cf = Array.isArray(data.iceServers)
      ? data.iceServers
      : data.iceServers
        ? [data.iceServers]
        : [];
    if (cf.length === 0) {
      return {
        iceServers: FALLBACK_STUN,
        source: "fallback",
        error: "Cloudflare returned no ICE servers",
      };
    }
    return {
      iceServers: [...cf, ...FALLBACK_STUN],
      source: "cloudflare",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[turn] Fetch failed: ${msg}`);
    return {
      iceServers: FALLBACK_STUN,
      source: "fallback",
      error: msg,
    };
  }
}

function clientIdFromHeaders(): string {
  const cf = getRequestHeader("cf-connecting-ip");
  if (cf) return cf;
  const fwd = getRequestHeader("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return "unknown";
}

/**
 * Mints a short-lived ICE server list from Cloudflare's TURN service.
 * Server-only: API token never reaches the browser. Falls back to public STUN
 * if Cloudflare is unreachable so same-network sessions still work.
 */
export const getIceServers = createServerFn({ method: "GET" }).handler(
  async (): Promise<IceServersResult> => {
    const clientId = clientIdFromHeaders();
    const { allowed } = checkRateLimit(clientId, Date.now());
    if (!allowed) {
      setResponseStatus(429);
      return {
        iceServers: FALLBACK_STUN,
        source: "fallback",
        error: "rate_limited",
      };
    }
    return mintIceServers(
      {
        tokenId: process.env.CLOUDFLARE_TURN_TOKEN_ID,
        apiToken: process.env.CLOUDFLARE_TURN_API_TOKEN,
      },
      fetch,
    );
  },
);
