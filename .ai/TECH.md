# Tech Brief: Lean Baby Monitor PWA

## 1. Product Vision & Strategy
**Core Goal:** To build the most reliable real-world baby monitor web application. This product prioritizes "Rock-Solid" core functionality over a bloated feature set, ensuring parents can trust the monitor in high-stakes environments.

### Core Principles
* **Reliability > Features:** Core functionality must be flawless before adding extras.
* **Privacy First:** Peer-to-peer (P2P) handling of all audio and video streams.
* **Silent Recovery > Loud Errors:** Graceful handling of network hiccups to avoid unnecessary panic.
* **UX Focus:** Minimal taps, zero-friction setup, and zero accounts.

### Market Context
Research shows that parents are frustrated by existing apps due to **connectivity issues, high battery drain, and privacy concerns**. This app addresses these by utilizing modern PWA capabilities and efficient WebRTC streaming.

---

## 2. Technical Stack & Infrastructure
* **Frontend:** **React (Vite)** for robust state management and rapid deployment.
* **Signaling:** **PeerJS Cloud** for simplified matchmaking and handshake.
* **Connectivity:** **Google Public STUN** servers for IP discovery.
    * *Note:* Defaulting to STUN for MVP; TURN transition is the primary upgrade path if Gate 3 (Remote) reliability is insufficient on specific networks.
* **PWA:** Full Progressive Web App implementation using **Screen Wake Lock API** to keep devices active.

---

## 3. Core User Flows
### Pairing (PIN + UUID Handshake)
1.  **Baby Device:** Generates a 6-digit PIN and displays it as a QR code.
2.  **Parent Device:** Scans the QR or enters the PIN.
3.  **The Handshake:** Devices exchange unique UUIDs stored in `localStorage`. 
4.  **Verification:** The session is only established if both PIN and UUID handshake verify successfully, preventing unauthorized stream hijacking.

### Safe Disconnection
* **Delayed Modal:** Tapping "End Session" triggers a confirmation modal.
* **Cognitive Friction:** The "Yes, End Session" button is disabled for **2 seconds** to prevent accidental termination.
* **Cleanup:** On confirmation, the app explicitly calls `track.stop()` on all media and resets to the Pairing state.

---

## 4. Functional & Hardware Requirements
* **Video Quality:** Default to **480p (Standard Definition)** to prioritize battery longevity and prevent device overheating.
* **Audio Logic:** * **Echo Cancellation:** ENABLED (to prevent feedback loops).
    * **Noise Suppression:** DISABLED (to ensure faint stirring or high-pitched cries are not filtered out).
* **Power Management:** Mandatory implementation of the **Wake Lock API** to prevent the Baby Device from sleeping during a session.
* **Audio Prioritization:** In degraded network states, video is programmatically dropped to ensure the audio link remains live.

---

## 5. UI/UX States & Escalation
The app follows a **Finite State Machine (FSM)** to handle connection health:

| Connection State | Threshold | Visual UI Feedback | Audio Alert |
| :--- | :--- | :--- | :--- |
| **Connected** | Healthy | Live Video/Audio | None |
| **Degraded** | High Packet Loss | **Audio Waveform** + Timestamp of drop | Live Audio Only |
| **Reconnecting** | 0s - 10s | "Reconnecting..." Banner | None (Silent Recovery) |
| **Soft Alert** | 11s - 59s | "Still trying to reach baby..." | Soft, intermittent chime |
| **Critical Failure** | 60s+ | **"MONITOR DISCONNECTED"** | Continuous loud alarm |

* **Heartbeat Monitor:** The Parent Device expects a data packet every **3 seconds**. Failure to receive this pulse triggers the "Reconnecting" state immediately.

---

## 6. Engineering Standards
* **Testing:** * Unit tests for the **Escalation Timer** (0s/11s/60s).
    * Smoke test for **PeerJS handshake** verification.
* **Security:** * Strict **3-strike lockout** for PIN entries to prevent brute-forcing.
    * HTTPS enforcement for camera/microphone access.
* **Code Quality:** * Separation of WebRTC logic from React UI components.
    * Mandatory cleanup routines for all `MediaStream` objects to prevent memory leaks.
* **Transparency:** A hidden technical overlay must be accessible to view real-time latency, bitrate, and packet loss.

---

## 7. Success Gates (Evaluation)
1.  **Gate 1:** Runs successfully on two real physical devices.
2.  **Gate 2:** Works flawlessly on the same Wi-Fi network.
3.  **Gate 3:** Works seamlessly across different networks (e.g., Wi-Fi to Cellular).
4.  **Gate 4:** Relies on absolutely zero mocks or fake data.
***