# Implementation Plan — PRD/TECH Gap Closure

Choices baked in: **mini-panel overlay**, **long-press session timer** trigger, **Vitest now**, **in-memory rate limiting**.

Delivered as four small batches so you can verify between them.

---

## Batch A — Resilience & Audio Persistence

Goal: keep the parent stream alive through transient network drops and mobile-browser backgrounding (TECH §reliability).

### A1 — ICE restart on failure (`src/lib/peerManager.ts`)
- In `ParentSession.connect()`, after `peer.on("call")` wires up `pc`, attach an `iceconnectionstatechange` listener that:
  - Tracks when state enters `disconnected` or `failed`.
  - If still in that state after **3 s**, calls `pc.restartIce()` and emits `onWarning?.("Reconnecting ICE…")`.
  - Logs the restart in dev console.
- Same on the `BabySession` side for the outgoing call's `pc`.
- Cap to 3 restarts per minute to avoid loops.

### A2 — Track watchdog
- On the parent `remoteStream`, attach `track.onmute` / `track.onunmute` listeners for both audio and video tracks.
- Mute >3 s → set state to `RECONNECTING_SILENT` and emit warning.
- Unmute → restore `CONNECTED` (the watchdog already handles heartbeat-based recovery; this just adds a faster signal).

### A3 — Hidden persistent audio element (`src/routes/parent.tsx`)
- Add a hidden `<audio ref={audioElRef} autoPlay playsInline />` mounted whenever `phase === "active"`, separate from the visible `<video>`.
- Bind `remoteStream` to it as well as the video element.
- Reason: when iOS Safari backgrounds the tab, `<video>` audio often pauses but a dedicated `<audio>` element keeps audio playing — critical for a baby monitor.
- Respect the existing `muted` toggle on both elements.

---

## Batch B — Diagnostics Overlay (Transparency requirement)

Goal: surface latency, bitrate, packet loss, jitter, and ICE candidate type per TECH §transparency.

### B1 — Extend stats in `peerManager.ts`
- Replace the existing single-purpose `startStatsPolling` with a richer loop that, every 2 s, computes:
  - `bitrateKbps` (existing logic, exposed)
  - `rttMs` from `remote-inbound-rtp.roundTripTime` (×1000)
  - `jitterMs` from `inbound-rtp.jitter` (×1000)
  - `packetsLost` and `packetLossPct` (delta over interval)
  - `localCandidateType` / `remoteCandidateType` (host / srflx / relay) — same logic as the dev-only diagnostic, refactored into a shared helper.
- Add `onStats?: (s: StatsSnapshot) => void` to `SessionEvents`.
- Define and export `StatsSnapshot` type from `src/lib/types.ts`.

### B2 — `DiagnosticsOverlay.tsx` (`src/components/monitor/DiagnosticsOverlay.tsx`)
- Mini-panel: bottom-left, `~220×140 px`, semi-transparent black (`bg-black/70`), monospace, rounded.
- Rows: `RTT`, `Bitrate`, `Loss %`, `Jitter`, `ICE` (e.g. `relay/relay`), `State`.
- Accepts `{ stats: StatsSnapshot | null; state: ConnectionState; onClose: () => void }`.
- Includes a small `×` close button.

### B3 — Long-press trigger on `SessionTimer`
- Update `src/components/monitor/SessionTimer.tsx` to accept an optional `onLongPress?: () => void` prop and a `triggerLabel` for accessibility.
- Implement a 1.5 s long-press detector via `pointerdown`/`pointerup`/`pointercancel` (works for mouse + touch + pen). Cancel on `pointermove > 10 px`.
- In both `parent.tsx` and `baby.tsx`:
  - Add `const [showDiag, setShowDiag] = useState(false)` and `const [stats, setStats] = useState<StatsSnapshot | null>(null)`.
  - Wire `onStats: setStats` into the session events.
  - Pass `onLongPress={() => setShowDiag(s => !s)}` to `SessionTimer`.
  - Render `<DiagnosticsOverlay …>` when `showDiag`.

### B4 — Baby-side stats
- `BabySession` currently has no stats loop; add a minimal one mirroring the parent so the Baby device's overlay is meaningful too. Same shape.

---

## Batch C — Security & UX hardening

### C1 — In-memory rate limit on `getIceServers` (`src/lib/turnCredentials.functions.ts`)
- Module-scope `Map<string, { count: number; windowStart: number }>` keyed by client IP (read via `getRequestHeader("cf-connecting-ip")` with fallback to `"x-forwarded-for"` first segment, else `"unknown"`).
- Window: 60 s rolling. Limit: **20 mints per IP per minute**.
- On exceed: return `{ iceServers: FALLBACK_STUN, source: "fallback", error: "rate_limited" }` with `setResponseStatus(429)`.
- Note in code comment: per-isolate; acceptable for cost defense, not strict abuse prevention.

### C2 — PIN invalidation on session end
- Already happens implicitly via `peer.destroy()` in `BabySession.end()`. **Verify** by adding an explicit comment + a regression test (Batch D). No code change unless audit reveals a leak.

### C3 — Explicit "Retry" affordance on signaling errors (`parent.tsx`)
- When `errorMsg` contains `"Cannot reach pairing service"` or `"Could not reach the Baby Device"`, render a small inline `Retry` button next to the error banner that re-invokes `startSession(pin, secret)` with the last attempted credentials (store them in a ref).
- For non-retryable errors (PIN rejected / unavailable), keep current behavior.

---

## Batch D — Tests (Vitest)

### D1 — Setup
- `bun add -d vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom`
- Add `vitest.config.ts` with `test: { environment: "jsdom", globals: true, setupFiles: ["./src/test/setup.ts"] }`.
- `src/test/setup.ts` imports `@testing-library/jest-dom`.
- Add `"test": "vitest run"` script to `package.json`.

### D2 — Heartbeat escalation test (`src/lib/__tests__/peerManager.heartbeat.test.ts`)
- Use `vi.useFakeTimers()` and a stubbed `ParentSession` watchdog harness:
  - At `t = 0`: state `CONNECTED`.
  - At `t = 11 s` (>RECONNECT_THRESHOLD): expect `RECONNECTING_SILENT`.
  - At `t = 30 s` (≥WARN): expect `RECONNECTING_WARN` and `startSoftChime` called.
  - At `t = 60 s` (≥CRITICAL): expect `CONNECTION_LOST` and `startAlarm` called.
  - Mock `audioAlerts` module.
- May require extracting the watchdog tick logic from `ParentSession` into an exported pure helper `evaluateHeartbeat(lastSeen, degradationFirstAt, now)` returning `{ state, transitions }`. Refactor minimally.

### D3 — PIN/secret test (`src/lib/__tests__/pairing.test.ts`)
- `generateSecurePin()` returns a 6-digit string and is sufficiently random across N samples.
- `timingSafeEqual` returns false for mismatched lengths and same-length-different content; true for equal.
- `parsePairingPayload`/`encodePairingPayload` round-trip.

### D4 — TURN endpoint test (`src/lib/__tests__/turnCredentials.test.ts`)
- Refactor: extract the credential-fetching logic into a pure function `mintIceServers(env, fetchImpl, clientId, now)` that the server function calls. Unit-test:
  - Returns Cloudflare list when API ok.
  - Returns fallback when API errors.
  - Returns `rate_limited` after 21st call within 60 s for same `clientId`.
  - Resets after window rolls.

---

## Files touched (summary)
- **Edit**: `src/lib/peerManager.ts`, `src/lib/turnCredentials.functions.ts`, `src/lib/types.ts`, `src/components/monitor/SessionTimer.tsx`, `src/routes/parent.tsx`, `src/routes/baby.tsx`, `package.json`
- **Create**: `src/components/monitor/DiagnosticsOverlay.tsx`, `vitest.config.ts`, `src/test/setup.ts`, `src/lib/__tests__/peerManager.heartbeat.test.ts`, `src/lib/__tests__/pairing.test.ts`, `src/lib/__tests__/turnCredentials.test.ts`

---

## Verification after implementation
1. **Resilience**: Throttle network in DevTools → confirm ICE restart log + audio recovery.
2. **Background audio**: Lock phone screen → audio continues from hidden `<audio>`.
3. **Overlay**: Long-press the session timer for 1.5 s → mini panel appears with live RTT/bitrate/loss/jitter/ICE pair.
4. **Rate limit**: `for i in $(seq 1 25); do curl …getIceServers; done` → 21st+ returns `rate_limited`.
5. **Tests**: `bun run test` → all pass.

Approving this plan switches me to implementation mode and I'll ship Batch A → D in one pass, pausing only if anything fails.
