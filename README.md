# 🌙 Lean Baby Monitor

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Live Demo](https://img.shields.io/badge/demo-live-success.svg)](https://lean-baby-cam.lovable.app)


> A zero-install, peer-to-peer baby monitor that runs in any modern browser.

![Lean Baby Monitor Preview](https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/18e997d9-d2ed-473b-b698-ef9aef8a4dba/id-preview-4ae3b8fc--18aa92c1-79f9-4cf8-a7f8-dc5c78304fff.lovable.app-1777223195125.png)

**[🔴 Try the Live Demo here](https://lean-baby-cam.lovable.app)**

## Table of Contents
- [About the Experiment](#about-the-experiment)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Testing & Deployment](#testing)

This app is an experiment to create a real baby monitor app across a baby and parent device. Created with an AI-first product development approach.

## About the Experiment
**Hypothesis:** Can I build a real, secure, and functioning peer-to-peer baby monitor application from scratch within a strict **4-hour net working time** limit using an AI-first approach?

**Summary of Results:**
By front-loading context creation (PRD, Technical Blueprint) to establish strict guardrails, the AI toolchain (Gemini + Lovable) proved highly effective for scaffolding a zero-friction WebRTC baby monitor. While AI significantly accelerated development, manual intervention was still required to overcome real-world network constraints (e.g., symmetric NATs blocking STUN on cellular networks) and to enforce security measures that the AI initially overlooked.

-> **Read the full experiment details, approach, and learnings in [EXPERIMENT.md](EXPERIMENT.md)**.
-> **See the original constraints in [PRODUCT-CHALLENGE.md](.ai/PRODUCT-CHALLENGE.md)**.

## Features

### Pairing
- 6-digit PIN auto-generated per session, with a 4-character verification code as a second factor (`src/lib/pairing.ts`).
- QR code on the baby device — scan with the parent device's camera (`html5-qrcode`).
- PINs/codes expire when the session ends; nothing is persisted.

### Streaming
- WebRTC audio + video, signaled via PeerJS.
- Automatic transport selection: **LAN** (host candidates) → **direct P2P** across the internet → **Cloudflare TURN relay** as a last resort.
- Dedicated `/baby` (camera + mic publisher) and `/parent` (viewer) routes.

### Monitor UX
- Live waveform fallback when video is unavailable, real-time mic level meter, session timer, status pill, end-session confirmation, and audio alerts on disconnect (`src/components/monitor/*`, `src/lib/audioAlerts.ts`).

### Reliability
- Heartbeat-driven state machine: `CONNECTED → RECONNECTING_SILENT (3s) → RECONNECTING_WARN (10s) → CONNECTION_LOST (60s)`.
- Automatic ICE restart on transient failures, rate-limited to 3/min to avoid loops.
- Screen Wake Lock on both devices to prevent the OS from sleeping mid-session (`src/hooks/useWakeLock.ts`).
- Hidden persistent `<audio>` element on the parent so audio survives tab backgrounding on iOS/Android.

### Diagnostics overlay
- **Long-press the session timer (1.5 s)** to open a live stats panel with RTT, bitrate, packet loss, jitter, ICE state, raw candidate types, and a human-readable **Route** indicator:
  - 🟢 **LAN (same network)** — `host`/`host` candidate pair
  - 🔵 **Direct P2P** — STUN-traversed across networks
  - 🟡 **Relayed (cloud)** — Cloudflare TURN

### PWA
- Installable to home screen with offline shell. Service worker is registered carefully to avoid interfering with development previews (`src/lib/registerSW.ts`, `vite-plugin-pwa`).

### TURN
- Short-lived credentials minted **server-side** through a TanStack Start server function (`src/lib/turnCredentials.functions.ts`) so the API token never reaches the browser. Includes an in-memory rate limiter (20 req/min/IP) as a cost guard.

### Privacy
- No accounts, no analytics, no database. Media is never recorded or persisted on any server. The signaling channel only carries SDP and ICE metadata.

## Tech stack

- **Framework:** [TanStack Start v1](https://tanstack.com/start) (file-based routing + server functions) on **React 19**
- **Build:** Vite 7, TypeScript 5.8 (strict)
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/vite`, no `tailwind.config.js`) + shadcn/ui + Radix primitives
- **WebRTC:** PeerJS 1.5 + Cloudflare Realtime TURN
- **State:** Zustand, Zod
- **UX:** Lucide icons, Sonner toasts, `html5-qrcode`, `qrcode.react`
- **Testing:** Vitest + jsdom + Testing Library (24 tests)
- **Hosting:** Cloudflare Workers via `@cloudflare/vite-plugin` and `wrangler.jsonc`

## Architecture

```text
 [Baby phone] --SDP/ICE--> [PeerJS broker] <--SDP/ICE-- [Parent phone]
      \                                                        /
       \---------- WebRTC media (LAN / P2P / TURN) -----------/
                              ^
                              | TURN creds (short-lived)
                  [Cloudflare Worker — server function]
```

- The **PeerJS broker** is used only for the initial signaling handshake. Once the peer connection is up, it's no longer involved.
- **Media never touches Lovable's servers.** It flows directly between the two browsers, with TURN used only as a fallback when both sides are behind strict NATs.
- The Cloudflare Worker is responsible for one thing: minting short-lived TURN credentials so the long-lived Cloudflare API token never ships to the client.

## Getting started

### Prerequisites
- Node 20+ **or** Bun 1.1+
- A modern browser with WebRTC + `getUserMedia` (Chrome, Safari 16+, Firefox)
- Two devices for real testing — they can be on the same Wi-Fi or completely separate networks
- *(Optional)* a Cloudflare account with the **Realtime TURN** product enabled, if you want cross-network sessions to work even when both peers are behind strict NATs

### Install

```bash
git clone <your-fork-url>
cd lean-baby-cam
bun install        # or: npm install
```

### Run locally

```bash
bun run dev
```

The dev server prints the URL to open (typically `http://localhost:8080`). Open `/baby` on the device that will hold the camera, `/parent` on the viewing device, and follow the pairing flow.

> **HTTPS note:** browsers refuse `getUserMedia` on non-secure origins. `localhost` is treated as secure, but to test on a phone over LAN you'll need either a self-signed HTTPS cert **or** a quick tunnel like `cloudflared tunnel --url http://localhost:8080` to get a real HTTPS URL.
> **HTTPS note:** Browsers refuse `getUserMedia` on non-secure origins. `localhost` is treated as secure, but to test on a phone over LAN you'll need either a self-signed HTTPS cert **or** a quick tunnel like `cloudflared tunnel --url http://localhost:8080` to get a real HTTPS URL.

## Environment variables

Both are **server-side only** and used solely by `src/lib/turnCredentials.functions.ts`:

| Variable                    | Purpose                                     |
| --------------------------- | ------------------------------------------- |
| `CLOUDFLARE_TURN_TOKEN_ID`  | Cloudflare Realtime TURN key ID             |
| `CLOUDFLARE_TURN_API_TOKEN` | Matching API token used to mint credentials |

How to obtain them: Cloudflare Dashboard → **Realtime → TURN** → create a key, copy the Token ID and the API token.

- For local development, drop them in a `.env` file at the repo root.
- For production, register them as Worker secrets: `wrangler secret put CLOUDFLARE_TURN_TOKEN_ID` and `wrangler secret put CLOUDFLARE_TURN_API_TOKEN`.

Without them, the app still works on the same Wi-Fi (host/STUN candidates) — only the cloud-relay fallback is disabled, and you'll see a yellow toast warning the first time you start a session.

## Available scripts

| Script              | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `bun run dev`       | Start the Vite dev server                            |
| `bun run build`     | Production build (Cloudflare Worker bundle)          |
| `bun run build:dev` | Development-mode build (helpful for source debugging)|
| `bun run preview`   | Serve the production build locally                   |
| `bun run lint`      | ESLint                                               |
| `bun run format`    | Prettier (writes in place)                           |
| `bun run test`      | Vitest suite (24 tests)                              |

## Testing

`bun run test` runs the full Vitest suite. Three files cover the trickiest pieces:

- `src/lib/__tests__/pairing.test.ts` — secure PIN generation, secret normalization, timing-safe comparison
- `src/lib/__tests__/heartbeat.test.ts` — escalation thresholds (3 s / 10 s / 60 s) for the connection-state machine
- `src/lib/__tests__/turnCredentials.test.ts` — credential minting, fallback paths, and the in-memory rate limiter

Add new specs as `*.test.ts` or `*.test.tsx` anywhere under `src/`; the Vitest config auto-discovers them (`vitest.config.ts`).

## Deployment

Default target is Cloudflare Workers (`wrangler.jsonc`, `compatibility_date: 2025-09-24`, `nodejs_compat`).

1. `bun run build`
2. `wrangler deploy`
3. Set the two TURN secrets the first time only (see the env-vars table above).

If you're using Lovable, the **Publish** button does steps 1–2 for you; secrets are managed in the project's secrets UI.

## Project structure

```text
src/
├── routes/
│   ├── __root.tsx           # SSR shell + meta + Toaster
│   ├── index.tsx            # Role picker (Baby vs. Parent)
│   ├── baby.tsx             # Camera + mic publisher
│   └── parent.tsx           # Viewer + diagnostics
├── components/
│   ├── monitor/             # AudioMeter, Waveform, StatusPill,
│   │                        # SessionTimer, EndSessionDialog,
│   │                        # DiagnosticsOverlay
│   └── ui/                  # shadcn/ui primitives
├── hooks/
│   ├── useAudioLevel.ts
│   └── useWakeLock.ts
├── lib/
│   ├── peerManager.ts       # WebRTC + heartbeat state machine
│   ├── pairing.ts           # PIN/secret generation + timing-safe compare
│   ├── audioAlerts.ts       # Soft chime + alarm via Web Audio
│   ├── turnCredentials.functions.ts   # Server fn for TURN creds
│   └── registerSW.ts        # PWA service-worker registration guard
└── test/
    └── setup.ts             # Vitest + jest-dom
```

## Browser support & known limitations

- **iOS Safari** requires a user gesture before audio can start. The home page primes the audio context on link tap, so audio "just works" once the user has clicked through to the role.
- **Wake Lock** is best-effort and unsupported on a few older browsers; the rest of the app degrades gracefully.
- **TURN fallback** only kicks in when the two `CLOUDFLARE_TURN_*` env vars are set and reachable. Without them, sessions across strict NATs may fail to connect.
- **PeerJS broker downtime** affects pairing only — established sessions are unaffected.

## License

Released under the MIT License.

## Acknowledgements

- [TanStack Start](https://tanstack.com/start) and [TanStack Router](https://tanstack.com/router)
- [PeerJS](https://peerjs.com/) for the signaling layer
- [Cloudflare Realtime TURN](https://developers.cloudflare.com/realtime/) for the relay tier
- [shadcn/ui](https://ui.shadcn.com/) and [Radix UI](https://www.radix-ui.com/) for the design system primitives
- Built with [Lovable](https://lovable.dev)