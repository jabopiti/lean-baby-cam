# Cloudflare TURN — Dynamic Credentials (Option B)

## Step 1 — Add the two secrets
I'll request these via the secure secret input UI:

- **`CLOUDFLARE_TURN_TOKEN_ID`** — the Token ID from your Cloudflare TURN App
- **`CLOUDFLARE_TURN_API_TOKEN`** — the API Token from your Cloudflare TURN App

Both are **server-only** secrets. They will never be exposed to the client bundle.

## Step 2 — Server function: `src/lib/turnCredentials.functions.ts`
- `getIceServers` server function (`createServerFn`, GET).
- Calls `https://rtc.live.cloudflare.com/v1/turn/keys/{TOKEN_ID}/credentials/generate-ice-servers`
  with `Authorization: Bearer {API_TOKEN}` and a 1-hour TTL request body.
- Returns `{ iceServers: RTCIceServer[] }` shaped for `RTCPeerConnection`.
- On failure: logs the error server-side and returns `{ iceServers: [], error: "..." }` so the client can fall back to STUN with a toast.

## Step 3 — Update `src/lib/peerManager.ts`
- Import `getIceServers` and call it before constructing `new Peer(...)`.
- Make `BabySession.start()` and `ParentSession.connect()` `async` and await the fetch.
- Pass the merged ICE list (Cloudflare TURN UDP+TCP+TLS variants + Google STUN as fallback) into `new Peer(id, { config: { iceServers } })`.
- If the fetch fails, fall back to the existing Google STUN-only config and surface a non-blocking warning.

## Step 4 — Update callers in `src/routes/baby.tsx` and `src/routes/parent.tsx`
- Await the now-async `start()` / `connect()` calls.
- Show a brief "Preparing secure relay…" state while credentials are being fetched (~200–500 ms).
- Toast on TURN-fetch failure: "Using direct connection only — may not work across networks."

## Step 5 — Diagnostics (dev-only)
- In `peerManager.ts`, after the peer connection is established, poll `pc.getStats()` once and log the **selected candidate pair type** (`host` / `srflx` / `relay`) behind `if (import.meta.env.DEV)`.
- This lets us confirm in the browser console that cross-network sessions are actually using `relay` candidates.

## Step 6 — Verify
After deploy, you'll test with the two devices on different networks and report back. If `relay` candidates are selected and media flows, we're done. If not, I'll inspect Worker logs for the credential fetch and the candidate-pair output.

---

**Approving this plan will:**
1. Open the secret input UI for `CLOUDFLARE_TURN_TOKEN_ID` and `CLOUDFLARE_TURN_API_TOKEN`.
2. Once you save them, I'll implement steps 2–5 in a single pass.
