import { describe, it, expect } from "vitest";
import {
  RECONNECT_THRESHOLD_MS,
  WARN_THRESHOLD_MS,
  CRITICAL_THRESHOLD_MS,
} from "../types";

/**
 * Pure helper mirroring `ParentSession.startWatchdog`'s state-machine logic.
 * Kept inline so tests document the spec without coupling to PeerJS internals.
 */
type HeartbeatState =
  | "CONNECTED"
  | "RECONNECTING_SILENT"
  | "RECONNECTING_WARN"
  | "CONNECTION_LOST";

function evaluateHeartbeat(
  lastSeen: number,
  degradationFirstAt: number,
  now: number,
): { state: HeartbeatState; nextDegradationFirstAt: number } {
  const since = now - lastSeen;
  if (since < RECONNECT_THRESHOLD_MS) {
    return { state: "CONNECTED", nextDegradationFirstAt: 0 };
  }
  const startedAt = degradationFirstAt === 0 ? now : degradationFirstAt;
  const dur = now - startedAt;
  if (dur >= CRITICAL_THRESHOLD_MS) {
    return { state: "CONNECTION_LOST", nextDegradationFirstAt: startedAt };
  }
  if (dur >= WARN_THRESHOLD_MS) {
    return { state: "RECONNECTING_WARN", nextDegradationFirstAt: startedAt };
  }
  return { state: "RECONNECTING_SILENT", nextDegradationFirstAt: startedAt };
}

describe("heartbeat watchdog escalation", () => {
  const lastSeen = 1_000_000;

  it("stays CONNECTED below the reconnect threshold", () => {
    const r = evaluateHeartbeat(lastSeen, 0, lastSeen + RECONNECT_THRESHOLD_MS - 1);
    expect(r.state).toBe("CONNECTED");
    expect(r.nextDegradationFirstAt).toBe(0);
  });

  it("enters RECONNECTING_SILENT past 3s gap", () => {
    const r = evaluateHeartbeat(lastSeen, 0, lastSeen + RECONNECT_THRESHOLD_MS + 100);
    expect(r.state).toBe("RECONNECTING_SILENT");
    expect(r.nextDegradationFirstAt).toBeGreaterThan(0);
  });

  it("escalates to RECONNECTING_WARN at 10s of degradation", () => {
    const degradationFirstAt = lastSeen + RECONNECT_THRESHOLD_MS;
    const r = evaluateHeartbeat(
      lastSeen,
      degradationFirstAt,
      degradationFirstAt + WARN_THRESHOLD_MS,
    );
    expect(r.state).toBe("RECONNECTING_WARN");
  });

  it("escalates to CONNECTION_LOST at 60s of degradation", () => {
    const degradationFirstAt = lastSeen + RECONNECT_THRESHOLD_MS;
    const r = evaluateHeartbeat(
      lastSeen,
      degradationFirstAt,
      degradationFirstAt + CRITICAL_THRESHOLD_MS,
    );
    expect(r.state).toBe("CONNECTION_LOST");
  });

  it("returns to CONNECTED when lastSeen advances", () => {
    const r = evaluateHeartbeat(lastSeen + 5000, 1234, lastSeen + 5000 + 100);
    expect(r.state).toBe("CONNECTED");
    expect(r.nextDegradationFirstAt).toBe(0);
  });

  it("preserves degradationFirstAt across consecutive sub-warn ticks", () => {
    const degradationFirstAt = lastSeen + RECONNECT_THRESHOLD_MS;
    const r = evaluateHeartbeat(lastSeen, degradationFirstAt, degradationFirstAt + 500);
    expect(r.state).toBe("RECONNECTING_SILENT");
    expect(r.nextDegradationFirstAt).toBe(degradationFirstAt);
  });
});