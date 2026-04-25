export type Role = "baby" | "parent";

export type ConnectionState =
  | "IDLE"
  | "PERMISSION_DENIED"
  | "PAIRING"
  | "CONNECTING"
  | "CONNECTED"
  | "RECONNECTING_SILENT"
  | "RECONNECTING_WARN"
  | "CONNECTION_LOST"
  | "ENDED";

export type HeartbeatMsg =
  | { type: "ping"; t: number }
  | { type: "pong"; t: number }
  | { type: "end" };

export const HEARTBEAT_INTERVAL_MS = 1000;
export const HEARTBEAT_CHECK_MS = 250;
export const RECONNECT_THRESHOLD_MS = 3000;
export const WARN_THRESHOLD_MS = 10000;
export const CRITICAL_THRESHOLD_MS = 60000;
export const LOW_BITRATE_THRESHOLD = 50_000; // bits/sec
export const LOW_BITRATE_DURATION_MS = 4000;
