# Add a comprehensive `README.md`

## Goal
Create a single `README.md` at the repo root that explains what the app is, lists every user-facing and technical feature, and walks a developer through cloning, configuring, running, testing, and deploying it.

Per your answers: **MIT license noted in README**, no separate `LICENSE` / `.env.example` / `CONTRIBUTING.md` / `SECURITY.md` / `docs/` files in this pass.

## File to create
- `README.md` (repo root)

## Proposed structure

1. **Title & one-liner** — "Lean Baby Cam — a zero-install, peer-to-peer baby monitor that runs in any modern browser."

2. **Live demo** — link to `https://lean-baby-cam.lovable.app`.

3. **Why it exists** — short paragraph: repurpose an old phone as a baby monitor, no accounts, no cloud recording, audio/video stays peer-to-peer whenever possible.

4. **Feature list** (grouped):
   - **Pairing**: 6-digit PIN, QR code scan (`html5-qrcode`), copy-to-clipboard, expiring codes (`src/lib/pairing.ts`).
   - **Streaming**: WebRTC audio + video over PeerJS, automatic LAN P2P / direct P2P / TURN-relayed fallback.
   - **Roles**: dedicated `/baby` (camera/mic publisher) and `/parent` (viewer) routes.
   - **Monitor UX**: live waveform, audio level meter, session timer, status pill, end-session confirmation, audio alerts on disconnect (`src/components/monitor/*`, `src/lib/audioAlerts.ts`).
   - **Reliability**: heartbeat with `CONNECTED` → `DEGRADED` → `LOST` state machine, auto-reconnect, screen wake-lock on the baby device (`src/hooks/useWakeLock.ts`).
   - **Diagnostics overlay**: long-press the session timer (1.5 s) for live RTT, bitrate, packet loss, jitter, ICE state, candidate types, and the new human-readable **Route** indicator (LAN / Direct P2P / Relayed).
   - **PWA**: installable, offline shell, service worker via `vite-plugin-pwa` and `src/lib/registerSW.ts`.
   - **TURN**: Cloudflare Realtime TURN credentials minted server-side via a TanStack server function (`src/lib/turnCredentials.functions.ts`) with in-memory rate limiting.
   - **Privacy**: no accounts, no analytics, media never persisted; signaling only carries SDP/ICE.

5. **Tech stack** — TanStack Start v1 + React 19, Vite 7, Tailwind v4, PeerJS, Zustand, Zod, Radix UI, Vitest, deployed to Cloudflare Workers via `@cloudflare/vite-plugin` + `wrangler.jsonc`.

6. **Architecture** — small ASCII diagram:
   ```
   [Baby phone] --SDP/ICE--> [PeerJS broker] <--SDP/ICE-- [Parent phone]
        \\                                                       /
         \\---------- WebRTC media (LAN / P2P / TURN) ----------/
                              ^
                              | TURN creds
                       [Cloudflare Worker server fn]
   ```
   Plus a 3–5 line explanation of signaling vs. media path.

7. **Getting started**
   - Prereqs: Node 20+ or Bun 1.1+, a modern browser, two devices on a network for real testing.
   - Clone + install: `bun install` (or `npm install`).
   - Run dev server: `bun run dev` → `http://localhost:8080` (or whatever Vite reports).
   - Open `/baby` on the camera device, `/parent` on the viewer; pair with the PIN/QR.

8. **Environment variables** — documented inline in the README (no separate `.env.example` per your choice):
   - `CLOUDFLARE_TURN_TOKEN_ID` — Cloudflare Realtime TURN token ID (server-only).
   - `CLOUDFLARE_TURN_API_TOKEN` — matching API token (server-only).
   - Note: without these, sessions still work over LAN/direct P2P; only the relayed-fallback path is disabled. Set them via `.env` for local dev and `wrangler secret put` for production.

9. **Available scripts** — table mapping `dev`, `build`, `build:dev`, `preview`, `lint`, `format`, `test` to what they do.

10. **Testing** — `bun run test` runs the Vitest suite (24 tests: pairing, heartbeat, TURN credentials).

11. **Deployment**
    - Default target: Cloudflare Workers (see `wrangler.jsonc`, `compatibility_date 2025-09-24`, `nodejs_compat`).
    - Build: `bun run build`, then `wrangler deploy` (or push via Lovable's "Publish" button).
    - Set the two TURN secrets with `wrangler secret put …` before first deploy.

12. **Project structure** — short tree of the most relevant folders (`src/routes`, `src/components/monitor`, `src/lib`, `src/hooks`).

13. **Browser support & known limitations** — iOS Safari requires a user gesture to start audio; wake-lock is best-effort; TURN fallback requires the Cloudflare secrets above.

14. **Diagnostics tip** — call out the long-press gesture and what each Route color means (green = LAN, blue = Direct P2P, amber = Relayed).

15. **License** — single short section: *Released under the MIT License.* (No standalone `LICENSE` file in this pass, per your choice.)

16. **Acknowledgements** — TanStack, PeerJS, Cloudflare Realtime, shadcn/ui, Lovable.

## Validation
- File exists at repo root and renders cleanly on GitHub-style markdown.
- All file paths and script names referenced in the README match what's actually in `package.json` and the `src/` tree.
- No code or config files are modified.
