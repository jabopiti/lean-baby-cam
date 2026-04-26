import { describe, it, expect, beforeEach, vi } from "vitest";
import { mintIceServers, checkRateLimit } from "../turnCredentials.functions";

describe("mintIceServers", () => {
  it("returns fallback when env is missing", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await mintIceServers({}, fetch);
    expect(result.source).toBe("fallback");
    expect(result.error).toBe("TURN credentials not configured");
    expect(result.iceServers.length).toBeGreaterThan(0);
    errSpy.mockRestore();
  });

  it("returns Cloudflare list when API responds OK", async () => {
    const fakeFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          iceServers: [{ urls: "turn:example.com:3478", username: "u", credential: "c" }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const result = await mintIceServers(
      { tokenId: "tid", apiToken: "tok" },
      fakeFetch as unknown as typeof fetch,
    );
    expect(result.source).toBe("cloudflare");
    expect(result.iceServers.some((s) => String(s.urls).includes("turn:example.com"))).toBe(true);
    // Includes STUN fallback appended
    expect(result.iceServers.some((s) => String(s.urls).includes("stun:"))).toBe(true);
  });

  it("returns fallback when Cloudflare errors", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fakeFetch = vi.fn(async () => new Response("nope", { status: 500 }));
    const result = await mintIceServers(
      { tokenId: "tid", apiToken: "tok" },
      fakeFetch as unknown as typeof fetch,
    );
    expect(result.source).toBe("fallback");
    expect(result.error).toMatch(/500/);
    errSpy.mockRestore();
  });

  it("returns fallback when fetch throws", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fakeFetch = vi.fn(async () => {
      throw new Error("network down");
    });
    const result = await mintIceServers(
      { tokenId: "tid", apiToken: "tok" },
      fakeFetch as unknown as typeof fetch,
    );
    expect(result.source).toBe("fallback");
    expect(result.error).toBe("network down");
    errSpy.mockRestore();
  });
});

describe("checkRateLimit", () => {
  let buckets: Map<string, { count: number; windowStart: number }>;
  beforeEach(() => {
    buckets = new Map();
  });

  it("allows up to 20 calls per IP per minute", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 20; i++) {
      expect(checkRateLimit("ip-a", t0 + i, buckets).allowed).toBe(true);
    }
    expect(checkRateLimit("ip-a", t0 + 21, buckets).allowed).toBe(false);
  });

  it("isolates buckets per client", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 20; i++) checkRateLimit("ip-a", t0, buckets);
    expect(checkRateLimit("ip-a", t0, buckets).allowed).toBe(false);
    expect(checkRateLimit("ip-b", t0, buckets).allowed).toBe(true);
  });

  it("resets after the window rolls over", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 20; i++) checkRateLimit("ip-a", t0, buckets);
    expect(checkRateLimit("ip-a", t0 + 30_000, buckets).allowed).toBe(false);
    // 60s after windowStart → fresh bucket
    expect(checkRateLimit("ip-a", t0 + 60_000, buckets).allowed).toBe(true);
  });
});