import { createServerFn } from "@tanstack/react-start";

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
 * Mints a short-lived ICE server list from Cloudflare's TURN service.
 * Server-only: API token never reaches the browser. Falls back to public STUN
 * if Cloudflare is unreachable so same-network sessions still work.
 */
export const getIceServers = createServerFn({ method: "GET" }).handler(
  async (): Promise<IceServersResult> => {
    const tokenId = process.env.CLOUDFLARE_TURN_TOKEN_ID;
    const apiToken = process.env.CLOUDFLARE_TURN_API_TOKEN;

    if (!tokenId || !apiToken) {
      console.error("[turn] Missing CLOUDFLARE_TURN_TOKEN_ID or CLOUDFLARE_TURN_API_TOKEN");
      return {
        iceServers: FALLBACK_STUN,
        source: "fallback",
        error: "TURN credentials not configured",
      };
    }

    try {
      const res = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${tokenId}/credentials/generate-ice-servers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
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
      // Cloudflare returns either a single object or an array — normalize.
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

      // Append Google STUN as belt-and-suspenders fallback.
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
  },
);
