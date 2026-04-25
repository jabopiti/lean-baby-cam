# Lean Baby Monitor — Implementation Plan

A zero-friction, zero-account PWA for streaming live audio/video from a "Baby" device to a "Parent" device using WebRTC. Pairing happens via a temporary 6-digit PIN + QR code; signaling rides on PeerJS Cloud; STUN via Google public servers.

## ⚠️ One important caveat (please read)
You chose **Full PWA with offline service worker**. Service workers behave badly inside Lovable's editor preview iframe (stale caches, broken navigation). I will:
- **Disable the SW in development** (`devOptions.enabled = false`)
- **Guard registration** so it never activates inside iframes or on `*lovable*` preview hosts
- Offline/install behavior will only be visible on the **published/deployed** URL or when you open the preview in a new tab

If you'd rather have a lighter "installable but no offline cache" version (manifest only), say the word and I'll trim it.

---

## 1. Heartbeat & Connection State Machine
- A PeerJS `DataConnection` opens alongside the media stream.
- Baby pings `{ t: ts }` every **1 s**. Parent echoes pong.
- A 250 ms watchdog tracks `now - lastSeen`. FSM transitions:
  - `0–3 s`: **CONNECTED** (normal UI)
  - `3–10 s`: **RECONNECTING_SILENT** — banner only, no sound
  - `11–59 s`: **RECONNECTING_WARN** — banner + soft intermittent chime (every ~4 s)
  - `60 s+`: **CONNECTION_LOST** — continuous loud alarm requiring manual dismissal
- In parallel, `RTCPeerConnection.getStats()` polls every 2 s. If inbound video bitrate falls below threshold (~50 kbps sustained for 4 s), Parent drops the video element and shows an animated waveform with `"Video signal dropped at HH:MM:SS"`.
- On heartbeat recovery: alarms stop, video re-enables automatically.

## 2. Pairing Flow
- **Role Selection screen** (`/`): two large buttons — "I'm the Baby Device" / "I'm the Parent Device".
- **Baby** (`/baby`): request camera+mic permissions → generate fresh 6-digit PIN → register PeerJS as `babymon-<PIN>` → display PIN + QR code (encoded value: the PIN). Wait for incoming connection.
- **Parent** (`/parent`): two tabs — **Scan QR** (uses **html5-qrcode**) and **Enter PIN** (6 numeric inputs). On submit, connect to `babymon-<PIN>`. Show "Connecting…" with target <3 s.
- **3-strike lockout**: 3 wrong PINs → 30 s cooldown on the Parent side.

## 3. Active Monitoring UI
- **Baby**: live audio-level meter (Web Audio `AnalyserNode` on local mic), large "End Session" button, screen dims to ~5% opacity overlay after 30 s of inactivity (tap to wake).
- **Parent**: full-bleed video, overlaid audio-level bar, session timer (HH:MM:SS), reconnection banner area, "End Session" button.

## 4. Audio Alerts (Web Audio API, no asset files)
- **Soft chime**: short two-note sine ping (~600 Hz → 800 Hz, 150 ms each), played every 4 s during `RECONNECTING_WARN`.
- **Loud alarm**: square-wave 880/660 Hz alternating siren at full gain, looped continuously during `CONNECTION_LOST` until user taps "Dismiss".
- Audio context is created lazily on first user gesture (browser autoplay policy).

## 5. Safe Termination
- Tapping "End Session" opens a confirmation dialog with **"Yes, End Session"** disabled for 2 s (visual countdown ring).
- On confirm: stop heartbeat, close DataConnection, close PeerConnection, `track.stop()` on every media track, release Wake Lock, navigate back to `/`.

## 6. Engineering Standards
- **Media constraints**: `{ width: 854, height: 480, frameRate: 15 }`, `{ echoCancellation: true, noiseSuppression: false, autoGainControl: true }`.
- **Wake Lock API** acquired on both devices on session start; re-acquired on `visibilitychange`.
- **Cleanup** centralized in a single `teardownSession()` call invoked from end-button, `beforeunload`, and route change.

## 7. PWA (with preview-safe guards)
- `vite-plugin-pwa` with `registerType: 'autoUpdate'`, `devOptions.enabled: false`.
- `manifest.webmanifest` with name "Lean Baby Monitor", standalone display, theme color, two icons (192/512 — generated as simple SVG-derived PNGs).
- Workbox precaches the app shell; `navigateFallbackDenylist: [/^\/~oauth/, /^\/api/]`.
- Registration guard in `src/main.tsx`: skip and unregister any SW when in iframe or on `id-preview--*` / `lovableproject.com` hosts.

## 8. Routes (TanStack Router)
- `/` — Role Selection
- `/baby` — Baby session (permissions + PIN/QR + monitoring)
- `/parent` — Parent pairing + monitoring

State per session lives in a `zustand` store; no persistence.

## 9. Dependencies to add
`peerjs`, `zustand`, `html5-qrcode`, `qrcode.react`, `vite-plugin-pwa`

## 10. Out of scope (v1)
- Multi-parent viewing, recording, cloud relay/TURN, push notifications, accounts, history.

---

**Ready when you are — hit Implement plan and I'll build it.**