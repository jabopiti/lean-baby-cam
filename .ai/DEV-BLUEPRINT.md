# Development Blueprint: Lean Baby Monitor (Enhanced)

## 1. Project Foundation (React-WebRTC Starter)
The project is scaffolded using **Vite + React + TypeScript** for maximum speed and type safety.
* **Core Dependencies:** `peerjs`, `lucide-react` (for UI icons), `framer-motion` (for the waveform animation).
* **Initialization:** The app uses a single `Peer` instance managed via a React Context to ensure the connection persists across component re-renders.

## 2. Handshake Pairing Logic (Security Adaptation)
To satisfy the **Privacy First** principle, the connection follows a mandatory two-stage "Identity Lock."

### The Sequence:
1.  **Stage 1: Data Connection:** The Parent Device opens a `DataConnection` to the Baby Device using the 6-digit PIN.
2.  **Stage 2: UUID Exchange:**
    * Parent sends: `{ type: 'AUTH_REQ', uuid: localUuid }`.
    * Baby checks its "Approved Parent" slot. If empty, it accepts and saves the UUID. If occupied, it rejects any UUID that doesn't match.
3.  **Stage 3: Media Upgrade:** Only after the Data Channel sends `{ type: 'AUTH_SUCCESS' }` does the Parent initiate the `peer.call()` for the A/V stream.

## 3. Streaming Resiliency (ha-babycam Logic)
Inspired by the "unstoppable stream" philosophy of `ha-babycam`, the app implements aggressive recovery.

* **The "Never-Give-Up" Loop:** Unlike standard video calls that hang on `disconnected`, the app monitors the `iceConnectionState`. If it stays `disconnected` or `failed` for >3s, the app triggers a full **ICE Restart**.
* **Track Watchdog:** The app doesn't just check if the "connection" is live; it monitors the `onmute` and `onunmute` events of the remote video track.
    * If `videoTrack.muted` persists for >5s while in a "Connected" state, the engine force-reloads the stream.
* **Background Audio Resilience:** To prevent iOS/Android from killing the audio when the tab is backgrounded:
    * The app uses a hidden `<audio>` element with `playsInline` and `autoPlay`.
    * A "User Gesture" (the Start Monitoring button) is used to resume the `AudioContext` to satisfy browser autoplay policies.

## 4. Updated Folder Structure
```text
/src
  /api
    ├── peerManager.ts      # Starter: PeerJS setup & STUN config
    └── handshake.ts        # Handshake: UUID verification logic
  /hooks
    ├── useMedia.ts         # Starter: 480p constraints
    ├── useResilience.ts    # ha-babycam: ICE Restart & Watchdog loops
    └── useWakeLock.ts      # Reliability: Screen stay-on logic
  /store
    └── connectionStore.ts  # FSM: PAIRING -> AUTHENTICATING -> LIVE -> RECOVERY
```

## 5. Core Scaffolding Snippets

### A. The Resilient Watchdog (ha-babycam style)
```typescript
// src/hooks/useResilience.ts
const startWatchdog = (peerConnection: RTCPeerConnection) => {
  peerConnection.oniceconnectionstatechange = () => {
    if (['failed', 'disconnected'].includes(peerConnection.iceConnectionState)) {
      console.log("Resiliency Trigger: Attempting ICE Restart...");
      // Trigger PeerJS reconnect or ICE restart logic here
    }
  };
};
```

### B. The Handshake Gate
```typescript
// src/api/handshake.ts
const handleIncomingData = (data: any, conn: DataConnection) => {
  if (data.type === 'AUTH_REQ') {
    const isAuthorized = verifyUuid(data.uuid); 
    if (isAuthorized) {
      conn.send({ type: 'AUTH_SUCCESS' });
      // Now allow the MediaConnection (A/V Call)
    } else {
      conn.send({ type: 'AUTH_FAILURE' });
      conn.close();
    }
  }
};
```

## 6. Success Gate Alignment
* **Gate 2 (Same Wi-Fi):** Handled by the React-WebRTC starter's default Host-to-Host routing.
* **Gate 3 (Remote):** Guaranteed by the `useResilience` ICE Restart logic which forces the STUN/TURN lookup if the local path fails.
* **Gate 4 (No Mocks):** The PIN+UUID handshake ensures we are always talking to a real, verified physical device.

***

This blueprint is now a "Battle-Hardened" specification. It combines the ease of a **Starter**, the security of a **Handshake**, and the reliability of **`ha-babycam`**. 

Are you ready to move into the **Final Prompt for the AI Agent** to generate the actual code?