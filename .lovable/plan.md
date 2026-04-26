# Surface connection topology in the diagnostics overlay

## Goal
Make it immediately obvious whether a session is flowing over the **LAN**, a **direct P2P** route across networks, or a **cloud-relayed (TURN)** path — without forcing the user to interpret raw `host` / `srflx` / `relay` candidate strings.

## Scope
Single file change: `src/components/monitor/DiagnosticsOverlay.tsx`.

No changes to `peerManager.ts`, `types.ts`, or routes — the required data (`localCandidateType`, `remoteCandidateType`) is already plumbed through `StatsSnapshot`.

## Changes to `src/components/monitor/DiagnosticsOverlay.tsx`

1. **Add a `describeRoute(local, remote)` helper** that maps candidate-type pairs to a label + tone:
   - either side is `relay` → **"Relayed (cloud)"**, amber dot
   - both sides are `host` → **"LAN (same network)"**, green dot
   - any other resolved combination (`srflx`/`prflx`/`host` mix) → **"Direct P2P"**, blue dot
   - missing data → **"—"**, muted

2. **Add a new "Route" row** at the top of the `<dl>` (above the existing rows) showing:
   - a small colored status dot (using existing Tailwind tokens: `bg-emerald-400`, `bg-sky-400`, `bg-amber-400`, `bg-white/30`)
   - the human label

3. **Rename the existing "Pair" row to "Candidates"** so the relationship between the friendly Route and the raw candidate types is clear (Route is derived from Candidates).

4. Keep all existing rows (State, ICE, Candidates, RTT, Bitrate, Loss, Jitter) unchanged otherwise. No prop or API changes — the component signature stays identical, so no updates needed in `parent.tsx` or `baby.tsx`.

## Validation
- Visual check via long-press on the session timer in both `/parent` and `/baby` routes.
- Type-check passes (`tsc --noEmit`) — no new types introduced.
- Existing Vitest suite remains green (no logic touched outside the overlay component).
