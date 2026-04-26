import Peer, { type DataConnection, type MediaConnection } from "peerjs";
import {
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_CHECK_MS,
  RECONNECT_THRESHOLD_MS,
  WARN_THRESHOLD_MS,
  CRITICAL_THRESHOLD_MS,
  LOW_BITRATE_THRESHOLD,
  LOW_BITRATE_DURATION_MS,
  type ConnectionState,
  type HeartbeatMsg,
  type StatsSnapshot,
} from "./types";
import { startSoftChime, stopSoftChime, startAlarm, stopAlarm } from "./audioAlerts";
import { timingSafeEqual } from "./pairing";
import { getIceServers } from "./turnCredentials.functions";

const PEER_PREFIX = "babymon-v1-";
const AUTH_TIMEOUT_MS = 3000;
const ICE_FAILURE_RESTART_MS = 3000;
const TRACK_MUTED_THRESHOLD_MS = 3000;
const ICE_RESTART_LIMIT_PER_MIN = 3;
const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export const peerIdFromPin = (pin: string) => PEER_PREFIX + pin;

/**
 * Fetch fresh ICE servers (Cloudflare TURN + STUN). Returns null on hard
 * failure so callers can decide to surface a warning. Always returns *some*
 * usable list — at minimum public STUN — so same-network sessions still work.
 */
async function fetchIceServers(): Promise<{ list: RTCIceServer[]; warning: string | null }> {
  try {
    const result = await getIceServers();
    if (result.source === "fallback") {
      return {
        list: result.iceServers,
        warning: result.error ?? "Relay unavailable — cross-network may not work.",
      };
    }
    return { list: result.iceServers, warning: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      list: FALLBACK_ICE_SERVERS,
      warning: `Relay fetch failed: ${msg}`,
    };
  }
}

/** Dev-only diagnostic: log which kind of ICE candidate pair was selected. */
function logSelectedCandidatePair(pc: RTCPeerConnection, label: string): void {
  if (!import.meta.env.DEV) return;
  void readPcStats(pc).then((s) => {
    if (s.localCandidateType || s.remoteCandidateType) {
      // eslint-disable-next-line no-console
      console.log(
        `[ICE ${label}] selected pair: local=${s.localCandidateType} remote=${s.remoteCandidateType}`,
      );
    }
  });
}

/**
 * Read a rich stats snapshot from the underlying RTCPeerConnection.
 * Used by both the diagnostics overlay and the dev-only logger.
 */
async function readPcStats(pc: RTCPeerConnection): Promise<StatsSnapshot> {
  const snap: StatsSnapshot = {
    bitrateKbps: null,
    rttMs: null,
    jitterMs: null,
    packetsLost: null,
    packetLossPct: null,
    localCandidateType: null,
    remoteCandidateType: null,
    iceConnectionState: pc.iceConnectionState,
    updatedAt: Date.now(),
  };
  try {
    const stats = await pc.getStats();
    const candidates = new Map<string, string | undefined>();
    let inboundBytes = 0;
    let packetsLost = 0;
    let packetsReceived = 0;
    stats.forEach((report) => {
      if (report.type === "local-candidate" || report.type === "remote-candidate") {
        candidates.set(report.id, (report as { candidateType?: string }).candidateType);
      }
      if (report.type === "inbound-rtp" && (report as { kind?: string }).kind === "video") {
        const r = report as {
          bytesReceived?: number;
          jitter?: number;
          packetsLost?: number;
          packetsReceived?: number;
        };
        inboundBytes += r.bytesReceived ?? 0;
        if (typeof r.jitter === "number") snap.jitterMs = Math.round(r.jitter * 1000);
        if (typeof r.packetsLost === "number") packetsLost += r.packetsLost;
        if (typeof r.packetsReceived === "number") packetsReceived += r.packetsReceived;
      }
      if (report.type === "remote-inbound-rtp") {
        const r = report as { roundTripTime?: number };
        if (typeof r.roundTripTime === "number") {
          snap.rttMs = Math.round(r.roundTripTime * 1000);
        }
      }
    });
    stats.forEach((report) => {
      if (
        report.type === "candidate-pair" &&
        (report as { state?: string }).state === "succeeded" &&
        (report as { nominated?: boolean }).nominated
      ) {
        const r = report as { localCandidateId?: string; remoteCandidateId?: string };
        if (r.localCandidateId) snap.localCandidateType = candidates.get(r.localCandidateId) ?? null;
        if (r.remoteCandidateId) snap.remoteCandidateType = candidates.get(r.remoteCandidateId) ?? null;
      }
    });
    snap.packetsLost = packetsLost;
    const total = packetsLost + packetsReceived;
    snap.packetLossPct = total > 0 ? Math.round((packetsLost / total) * 1000) / 10 : 0;
    // bitrate set by callers that have a `prevBytes/prevTime` pair.
    snap.iceConnectionState = pc.iceConnectionState;
    // attach raw bytes for delta calc
    (snap as StatsSnapshot & { _inboundBytes?: number })._inboundBytes = inboundBytes;
  } catch {
    // ignore
  }
  return snap;
}

/**
 * Watch ICE state on a peer connection and trigger restartIce() if the
 * connection has been disconnected/failed for more than `ICE_FAILURE_RESTART_MS`.
 * Caps restarts to avoid loops.
 */
function attachIceRestartWatcher(
  pc: RTCPeerConnection,
  label: string,
  onWarning?: (msg: string) => void,
): () => void {
  let badSince = 0;
  let restartTimes: number[] = [];
  let timer: number | null = null;

  const tryRestart = () => {
    const now = Date.now();
    restartTimes = restartTimes.filter((t) => now - t < 60_000);
    if (restartTimes.length >= ICE_RESTART_LIMIT_PER_MIN) {
      // eslint-disable-next-line no-console
      console.warn(`[ICE ${label}] restart cap reached, skipping`);
      return;
    }
    try {
      pc.restartIce();
      restartTimes.push(now);
      onWarning?.("Reconnecting…");
      // eslint-disable-next-line no-console
      console.log(`[ICE ${label}] restartIce() invoked`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`[ICE ${label}] restartIce failed`, e);
    }
  };

  const onChange = () => {
    const s = pc.iceConnectionState;
    if (s === "disconnected" || s === "failed") {
      if (badSince === 0) badSince = Date.now();
      if (timer === null) {
        timer = window.setTimeout(() => {
          timer = null;
          if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
            tryRestart();
          }
        }, ICE_FAILURE_RESTART_MS);
      }
    } else {
      badSince = 0;
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    }
  };

  pc.addEventListener("iceconnectionstatechange", onChange);
  return () => {
    pc.removeEventListener("iceconnectionstatechange", onChange);
    if (timer !== null) window.clearTimeout(timer);
  };
}

/**
 * Watch a remote MediaStream's tracks for sustained mute (>3s) which often
 * indicates a stalled subscription even when ICE looks healthy. Invokes
 * the provided callbacks when the stream goes silent and recovers.
 */
function attachTrackWatchdog(
  stream: MediaStream,
  onStall: () => void,
  onResume: () => void,
): () => void {
  const stallTimers = new Map<MediaStreamTrack, number>();
  let stalled = false;

  const setStall = (val: boolean) => {
    if (val === stalled) return;
    stalled = val;
    if (val) onStall();
    else onResume();
  };

  const onMute = (t: MediaStreamTrack) => {
    const timer = window.setTimeout(() => setStall(true), TRACK_MUTED_THRESHOLD_MS);
    stallTimers.set(t, timer);
  };
  const onUnmute = (t: MediaStreamTrack) => {
    const timer = stallTimers.get(t);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      stallTimers.delete(t);
    }
    // Only declare resumed when no track is currently muted.
    const anyMuted = stream.getTracks().some((tr) => tr.muted);
    if (!anyMuted) setStall(false);
  };

  const wire = (t: MediaStreamTrack) => {
    t.onmute = () => onMute(t);
    t.onunmute = () => onUnmute(t);
    if (t.muted) onMute(t);
  };
  stream.getTracks().forEach(wire);

  return () => {
    stream.getTracks().forEach((t) => {
      t.onmute = null;
      t.onunmute = null;
    });
    stallTimers.forEach((tm) => window.clearTimeout(tm));
    stallTimers.clear();
  };
}

export interface SessionEvents {
  onState: (s: ConnectionState) => void;
  onRemoteStream?: (s: MediaStream | null) => void;
  onLowBandwidth?: (low: boolean, droppedAt: Date | null) => void;
  onError?: (err: string) => void;
  onSessionEnded?: () => void;
  onWarning?: (msg: string) => void;
  onStats?: (s: StatsSnapshot) => void;
}

export class BabySession {
  private peer: Peer | null = null;
  private dataConn: DataConnection | null = null;
  private mediaCall: MediaConnection | null = null;
  private heartbeatTimer: number | null = null;
  private endedExternally = false;
  private authTimers = new WeakMap<DataConnection, number>();
  private authedConn: DataConnection | null = null;
  private detachIceWatch: (() => void) | null = null;
  private statsTimer: number | null = null;
  private prevBytes = 0;
  private prevStatsTime = 0;

  constructor(
    public pin: string,
    private secret: string,
    private localStream: MediaStream,
    private events: SessionEvents,
  ) {}

  async start(): Promise<void> {
    this.events.onState("PAIRING");
    const ice = await fetchIceServers();
    if (ice.warning) this.events.onWarning?.(ice.warning);
    return new Promise((resolve, reject) => {
      const peer = new Peer(peerIdFromPin(this.pin), {
        debug: 1,
        config: { iceServers: ice.list },
      });
      this.peer = peer;

      peer.on("open", () => resolve());
      peer.on("error", (err) => {
        const msg = (err as { type?: string; message?: string }).message ?? "Peer error";
        const type = (err as { type?: string }).type;
        if (type === "unavailable-id") {
          this.events.onError?.("That PIN is already in use. Please end the other session and try a new PIN.");
          reject(new Error("unavailable-id"));
        } else if (type === "network" || type === "server-error" || type === "socket-error") {
          this.events.onError?.("Cannot reach pairing service. Check your internet.");
        } else {
          this.events.onError?.(msg);
        }
      });

      peer.on("connection", (conn) => {
        // Hold connection in unauthenticated state until secret is verified.
        conn.on("open", () => {
          // Start auth timeout — drop if no valid auth message arrives.
          const timer = window.setTimeout(() => {
            try {
              conn.send({ type: "auth-fail" } satisfies HeartbeatMsg);
            } catch {
              // ignore
            }
            conn.close();
          }, AUTH_TIMEOUT_MS);
          this.authTimers.set(conn, timer);
        });
        conn.on("data", (raw) => {
          const msg = raw as HeartbeatMsg;
          // Pre-auth: only "auth" messages are accepted.
          if (this.authedConn !== conn) {
            if (msg.type === "auth" && typeof msg.secret === "string" && timingSafeEqual(msg.secret, this.secret)) {
              const timer = this.authTimers.get(conn);
              if (timer !== undefined) window.clearTimeout(timer);
              this.authTimers.delete(conn);
              // Promote this connection: drop any prior authed conn + media call.
              this.dataConn?.close();
              this.mediaCall?.close();
              this.authedConn = conn;
              this.dataConn = conn;
              try {
                conn.send({ type: "auth-ok" } satisfies HeartbeatMsg);
              } catch {
                // ignore
              }
              this.events.onState("CONNECTING");
              // Place the media call now that the peer is authenticated.
              const call = peer.call(conn.peer, this.localStream);
              this.mediaCall = call;
              call.on("close", () => {
                if (this.mediaCall === call) this.mediaCall = null;
              });
              const pcBaby = (call as unknown as { peerConnection?: RTCPeerConnection }).peerConnection;
              if (pcBaby) {
                pcBaby.addEventListener("iceconnectionstatechange", () => {
                  if (pcBaby.iceConnectionState === "connected" || pcBaby.iceConnectionState === "completed") {
                    logSelectedCandidatePair(pcBaby, "baby");
                  }
                });
                this.detachIceWatch?.();
                this.detachIceWatch = attachIceRestartWatcher(pcBaby, "baby", this.events.onWarning);
                this.startStatsLoop(pcBaby);
              }
              this.events.onState("CONNECTED");
              this.startHeartbeat();
            } else {
              try {
                conn.send({ type: "auth-fail" } satisfies HeartbeatMsg);
              } catch {
                // ignore
              }
              conn.close();
            }
            return;
          }
          // Post-auth message handling.
          if (msg.type === "ping") {
            try {
              conn.send({ type: "pong", t: Date.now() } satisfies HeartbeatMsg);
            } catch {
              // ignore
            }
          } else if (msg.type === "end") {
            this.endedExternally = true;
            this.events.onSessionEnded?.();
          }
        });
        conn.on("close", () => {
          const timer = this.authTimers.get(conn);
          if (timer !== undefined) {
            window.clearTimeout(timer);
            this.authTimers.delete(conn);
          }
          if (this.dataConn === conn) this.dataConn = null;
          if (this.authedConn === conn) this.authedConn = null;
        });
      });

      peer.on("call", (call) => {
        // Parent should NOT call us; Baby calls Parent. But accept defensively.
        // Do NOT answer — we only stream to authenticated peers.
        call.close();
      });
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (this.dataConn?.open) {
        try {
          this.dataConn.send({ type: "ping", t: Date.now() } satisfies HeartbeatMsg);
        } catch {
          // ignore
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  end() {
    this.stopHeartbeat();
    this.stopStatsLoop();
    this.detachIceWatch?.();
    this.detachIceWatch = null;
    try {
      this.dataConn?.send({ type: "end" } satisfies HeartbeatMsg);
    } catch {
      // ignore
    }
    this.dataConn?.close();
    this.mediaCall?.close();
    this.peer?.destroy();
    this.localStream.getTracks().forEach((t) => t.stop());
    // Invalidate session credentials so any straggler can't re-pair (PRD Flow 6).
    this.pin = "";
    this.secret = "";
    this.events.onState("ENDED");
  }

  private startStatsLoop(pc: RTCPeerConnection) {
    this.stopStatsLoop();
    this.statsTimer = window.setInterval(async () => {
      const snap = await readPcStats(pc);
      const inboundBytes = (snap as StatsSnapshot & { _inboundBytes?: number })._inboundBytes ?? 0;
      const now = Date.now();
      if (this.prevStatsTime !== 0) {
        const elapsed = (now - this.prevStatsTime) / 1000;
        const bps = ((inboundBytes - this.prevBytes) * 8) / Math.max(0.1, elapsed);
        snap.bitrateKbps = Math.round(bps / 1000);
      }
      this.prevBytes = inboundBytes;
      this.prevStatsTime = now;
      this.events.onStats?.(snap);
    }, 2000);
  }

  private stopStatsLoop() {
    if (this.statsTimer !== null) {
      window.clearInterval(this.statsTimer);
      this.statsTimer = null;
    }
    this.prevBytes = 0;
    this.prevStatsTime = 0;
  }

  get wasEndedRemotely() {
    return this.endedExternally;
  }
}

export class ParentSession {
  private peer: Peer | null = null;
  private dataConn: DataConnection | null = null;
  private mediaCall: MediaConnection | null = null;
  private remoteStream: MediaStream | null = null;
  private lastSeen = 0;
  private watchdogTimer: number | null = null;
  private degradationFirstAt = 0;
  private degradationTimer: number | null = null;
  private prevWarn = false;
  private prevCritical = false;
  private statsTimer: number | null = null;
  private prevBytes = 0;
  private prevStatsTime = 0;
  private lowSince = 0;
  private isLowBw = false;
  private authed = false;

  constructor(private events: SessionEvents) {}

  async connect(pin: string, secret: string): Promise<void> {
    this.events.onState("CONNECTING");
    const ice = await fetchIceServers();
    if (ice.warning) this.events.onWarning?.(ice.warning);
    return new Promise((resolve, reject) => {
      const peer = new Peer({
        debug: 1,
        config: { iceServers: ice.list },
      });
      this.peer = peer;

      const timeout = window.setTimeout(() => {
        this.events.onError?.("Could not reach the Baby Device. Check the PIN and that the other device is on Pairing.");
        reject(new Error("timeout"));
        peer.destroy();
      }, 12000);

      peer.on("error", (err) => {
        const type = (err as { type?: string }).type;
        if (type === "peer-unavailable") {
          window.clearTimeout(timeout);
          this.events.onError?.("No Baby Device found with that PIN.");
          reject(new Error("peer-unavailable"));
        } else if (type === "network" || type === "server-error" || type === "socket-error") {
          this.events.onError?.("Cannot reach pairing service. Check your internet.");
        }
      });

      peer.on("open", () => {
        const conn = peer.connect(peerIdFromPin(pin), { reliable: true });
        this.dataConn = conn;

        conn.on("open", () => {
          window.clearTimeout(timeout);
          // Send shared secret immediately to prove we hold the QR/PIN payload.
          try {
            conn.send({ type: "auth", secret } satisfies HeartbeatMsg);
          } catch {
            // ignore
          }
          this.lastSeen = Date.now();
          this.startWatchdog();
          resolve();
        });

        conn.on("data", (raw) => {
          const msg = raw as HeartbeatMsg;
          if (msg.type === "auth-fail") {
            this.events.onError?.("Pairing rejected. Re-scan the QR code on the Baby Device.");
            this.end();
            return;
          }
          if (msg.type === "auth-ok") {
            this.authed = true;
            this.lastSeen = Date.now();
            return;
          }
          if (msg.type === "pong" || msg.type === "ping") {
            this.lastSeen = Date.now();
          } else if (msg.type === "end") {
            this.events.onSessionEnded?.();
          }
          // Send our own ping back if we received a ping (kept symmetric)
          if (msg.type === "ping" && conn.open) {
            try {
              conn.send({ type: "pong", t: Date.now() } satisfies HeartbeatMsg);
            } catch {
              // ignore
            }
          }
        });

        // Also send pings ourselves so Baby sees us alive.
        const ourPing = window.setInterval(() => {
          if (conn.open) {
            try {
              conn.send({ type: "ping", t: Date.now() } satisfies HeartbeatMsg);
            } catch {
              // ignore
            }
          }
        }, HEARTBEAT_INTERVAL_MS);
        conn.on("close", () => window.clearInterval(ourPing));
      });

      peer.on("call", (call) => {
        call.answer();
        this.mediaCall = call;
        call.on("stream", (stream) => {
          this.remoteStream = stream;
          this.events.onRemoteStream?.(stream);
          this.events.onState("CONNECTED");
          this.startStatsPolling(call);
          const pcParent = (call as unknown as { peerConnection?: RTCPeerConnection }).peerConnection;
          if (pcParent) {
            pcParent.addEventListener("iceconnectionstatechange", () => {
              if (pcParent.iceConnectionState === "connected" || pcParent.iceConnectionState === "completed") {
                logSelectedCandidatePair(pcParent, "parent");
              }
            });
          }
        });
        call.on("close", () => {
          if (this.mediaCall === call) this.mediaCall = null;
        });
      });
    });
  }

  private startWatchdog() {
    this.stopWatchdog();
    this.watchdogTimer = window.setInterval(() => {
      const since = Date.now() - this.lastSeen;
      if (since < RECONNECT_THRESHOLD_MS) {
        // Healthy
        if (this.degradationFirstAt !== 0) {
          this.degradationFirstAt = 0;
          if (this.prevWarn) {
            stopSoftChime();
            this.prevWarn = false;
          }
          if (this.prevCritical) {
            stopAlarm();
            this.prevCritical = false;
          }
          if (this.remoteStream) {
            this.events.onState("CONNECTED");
          }
        }
      } else {
        if (this.degradationFirstAt === 0) {
          this.degradationFirstAt = Date.now();
        }
        const dur = Date.now() - this.degradationFirstAt;
        if (dur >= CRITICAL_THRESHOLD_MS) {
          if (!this.prevCritical) {
            this.prevCritical = true;
            startAlarm();
          }
          this.events.onState("CONNECTION_LOST");
        } else if (dur >= WARN_THRESHOLD_MS) {
          if (!this.prevWarn) {
            this.prevWarn = true;
            startSoftChime();
          }
          this.events.onState("RECONNECTING_WARN");
        } else {
          this.events.onState("RECONNECTING_SILENT");
        }
      }
    }, HEARTBEAT_CHECK_MS);
  }

  private stopWatchdog() {
    if (this.watchdogTimer !== null) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private startStatsPolling(call: MediaConnection) {
    this.stopStatsPolling();
    this.statsTimer = window.setInterval(async () => {
      const pc: RTCPeerConnection | undefined = (call as unknown as { peerConnection?: RTCPeerConnection }).peerConnection;
      if (!pc) return;
      try {
        const stats = await pc.getStats();
        let inboundBytes = 0;
        stats.forEach((report) => {
          if (report.type === "inbound-rtp" && (report as { kind?: string }).kind === "video") {
            inboundBytes += (report as { bytesReceived?: number }).bytesReceived ?? 0;
          }
        });
        const now = Date.now();
        if (this.prevStatsTime !== 0) {
          const elapsed = (now - this.prevStatsTime) / 1000;
          const bps = ((inboundBytes - this.prevBytes) * 8) / Math.max(0.1, elapsed);
          if (bps < LOW_BITRATE_THRESHOLD) {
            if (this.lowSince === 0) this.lowSince = now;
            if (now - this.lowSince > LOW_BITRATE_DURATION_MS && !this.isLowBw) {
              this.isLowBw = true;
              this.events.onLowBandwidth?.(true, new Date());
            }
          } else {
            this.lowSince = 0;
            if (this.isLowBw) {
              this.isLowBw = false;
              this.events.onLowBandwidth?.(false, null);
            }
          }
        }
        this.prevBytes = inboundBytes;
        this.prevStatsTime = now;
      } catch {
        // ignore
      }
    }, 2000);
  }

  private stopStatsPolling() {
    if (this.statsTimer !== null) {
      clearInterval(this.statsTimer);
      this.statsTimer = null;
    }
  }

  end() {
    this.stopWatchdog();
    this.stopStatsPolling();
    stopSoftChime();
    stopAlarm();
    try {
      this.dataConn?.send({ type: "end" } satisfies HeartbeatMsg);
    } catch {
      // ignore
    }
    this.dataConn?.close();
    this.mediaCall?.close();
    this.remoteStream?.getTracks().forEach((t) => t.stop());
    this.peer?.destroy();
    this.events.onState("ENDED");
  }
}
