# Product Requirements Document (PRD): Lean Baby Monitor Web App

## 1. Product Vision & Principles
* **Goal:** To build the best real baby monitor app, functioning reliably as a pure Web App without requiring downloads or account creation.
* **Core Principles:**
    * **Reliability > Features:** Core functionality must be rock-solid before adding extras.
    * **Privacy First:** Ensure data and streams are handled securely via peer-to-peer connections.
    * **Silent Recovery > Loud Errors:** The app should handle connection hiccups gracefully without causing unnecessary user panic.
    * **UX Focus:** Strive for fewer taps, less uncertainty, and more trust.

## 2. Target User & Market Context
* **Market Need:** Parents seek the convenience of using existing devices to avoid the high cost of dedicated hardware.
* **Key Pain Points:** Research shows that parents are most frustrated by unreliable connectivity, battery drain, privacy concerns, and unnecessary complexity or subscription friction.
* **Value Proposition:** This product succeeds by stripping away bloat and delivering a highly reliable, zero-friction, privacy-respecting core monitoring experience.

## 3. User Roles & Architecture
* **Baby Device:** The physical device situated with the child, responsible for sending real audio and video streams.
* **Parent Device:** The device used by the caregiver to monitor the baby and start the session.
* **Tech Stack:** A pure browser-based Web App using WebRTC for direct peer-to-peer Audio/Video streaming (supporting both local Wi-Fi and remote networks). A lightweight cloud signaling server is used strictly for the initial connection handshake.

## 4. Core User Flows
* **Zero-Friction Pairing:**
    1.  User opens the web app on the Baby Device; a large QR code and a 6-digit PIN are generated.
    2.  User opens the web app on the Parent Device and scans the QR code (or enters the PIN as a fallback).
    3.  Devices exchange signaling data via the cloud server to establish a direct peer-to-peer connection.
* **Safe Disconnection Flow:**
    1.  User taps "End Session" on either device.
    2.  A confirmation modal appears: *"Are you sure you want to stop monitoring?"*
    3.  The "Yes, End Session" button is disabled for 2 seconds to prevent accidental double-tap.
    4.  Once confirmed, the app terminates camera/microphone tracks and resets both devices to the "Pairing State."

## 4b. Detailed User Flows

There is a single app used on both the Baby Device and the Parent Device. On first open, the app displays a **Role Selection Screen** with two options: **"I'm the Baby Device"** and **"I'm the Parent Device"**. The user selects the appropriate role and each flow below begins from that point. No account or login is required.

### Flow 1: Session Initiation — Baby Device
1. Parent selects **"I'm the Baby Device"** on the Role Selection Screen.
2. The app requests camera and microphone permissions. If denied, an inline message explains that both are required to use this device as a monitor, and provides step-by-step instructions for granting permissions in the current browser (instructions are platform-specific: iOS Safari, Android Chrome, desktop Chrome/Firefox). A **"Try Again"** button re-triggers the permission request once the user has updated their settings.
3. Once permissions are granted, the app enters **Pairing State**: a large QR code is displayed alongside a 6-digit PIN. Both are generated fresh for this session and will expire once the session ends.
4. The screen stays fully lit while waiting for a connection.
5. When the Parent Device successfully connects, the Baby Device transitions to the **Monitoring Active** screen (see Flow 3).

### Flow 2: Session Initiation — Parent Device
1. Parent selects **"I'm the Parent Device"** on the Role Selection Screen.
2. The app presents two pairing options: **Scan QR Code** or **Enter PIN**.
    * **QR path:** The device camera activates and scans the code displayed on the Baby Device.
    * **PIN path:** A numeric input accepts the 6-digit PIN manually.
3. On a valid scan or PIN entry, both devices begin the WebRTC handshake via the signaling server. If the signaling server is unreachable at this point, the app displays an inline error: *"Unable to connect to pairing service. Please check your internet connection and try again."* A **"Retry"** button re-attempts the connection. Once a peer-to-peer session is successfully established, the signaling server is no longer required and its availability has no effect on the active session.
4. A brief **"Connecting…"** indicator is shown on the Parent Device during the handshake (typically under 3 seconds on a healthy network).
5. On successful connection, the Parent Device transitions to the **Active Monitoring** screen (see Flow 3).
6. If the handshake fails (e.g., expired PIN, network error), an inline error message is shown with a prompt to retry. The Baby Device remains in Pairing State with the same QR/PIN until the session ends.

### Flow 3: Active Monitoring
**Baby Device:**
- Displays a **"Monitoring Active"** screen with:
  - Audio-level indicator (live, reflecting microphone input)
  - Connection strength/status indicator
  - Session elapsed time
  - **"End Session"** button
- After 30 seconds of no interaction, the screen dims automatically to conserve battery. The camera and microphone remain fully active. Any touch on the screen restores full brightness.
- No other interaction is expected during an active session.

**Parent Device:**
- Displays the live video feed from the Baby Device.
- Persistent UI elements overlaid on or alongside the feed:
  - Audio-level indicator (reflecting the baby's microphone input)
  - Connection strength/status indicator
  - Session elapsed time
  - **"End Session"** button

### Flow 4: Connection Degradation
This flow activates when the system detects a sustained drop in connection quality or a complete loss of signal. States are progressive and escalate only if the issue persists.

| Timeframe | State | Baby Device | Parent Device |
|---|---|---|---|
| 0–10 sec | Reconnecting | No change | Silent "Reconnecting…" indicator replaces connection status |
| 11–59 sec | Reconnecting (extended) | No change | Soft, intermittent chime begins |
| Low bandwidth detected | Degraded | No change | Video feed replaced by animated audio waveform; timestamp shown: *"Video signal dropped at [time]"* (device local time of the Parent Device) |
| 60+ sec | Critical | No change | Full, continuous alarm requiring manual dismissal |

**Bandwidth downgrade rule:** If bandwidth drops below the threshold required to sustain video, the app drops the video track programmatically and prioritizes audio. This transition happens silently on the Baby Device side. Bandwidth degradation runs in parallel with the reconnection escalation timer — a low-bandwidth state can occur independently of, and does not reset, the 0–60s reconnection escalation sequence.

### Flow 5: Connection Recovery
1. When the peer-to-peer connection is re-established after any degraded or interrupted state:
    * Any active alarm or chime stops immediately.
    * A **"Connection restored"** message appears on the Parent Device and dismisses automatically after 5 seconds.
    * If video was dropped due to low bandwidth and sufficient bandwidth is now available, the video track is re-added automatically.
    * The Parent Device returns to the **Active Monitoring** screen.
2. No manual action is required from the parent to resume monitoring.
3. The Baby Device remains in Monitoring Active state throughout; it shows no recovery-specific UI.

### Flow 6: Session Termination
Termination can be initiated from either device.

1. Parent taps **"End Session"** on either the Baby Device or the Parent Device.
2. A confirmation modal appears on the initiating device: *"Are you sure you want to stop monitoring?"*
3. The **"Yes, End Session"** button is disabled for 2 seconds to prevent accidental double-tap, showing a visual countdown (e.g., "2… 1…"), then becomes active.
4. On confirmation:
    * Camera and microphone tracks are terminated on the Baby Device.
    * The peer-to-peer connection is closed.
    * The current PIN is invalidated and cannot be reused.
    * Both devices automatically return to **Pairing State** — the Baby Device generates a new QR code and PIN, ready for the next session.
5. If termination is initiated from the Parent Device, the Baby Device transitions to Pairing State automatically with no manual reset required.

---

## 5. Functional Requirements
* **A/V Streaming:** Capture and transmit real audio and video from the physical Baby Device using WebRTC.
* **Network Support:** Must function seamlessly on the same Wi-Fi network and across different networks (e.g., Wi-Fi to cellular).
* **Dynamic Bandwidth Downgrade:** The system monitors connection quality; if bandwidth drops, the app must programmatically drop the video track to prioritize audio transmission.

## 6. Non-Functional Requirements
* **No Mocks:** The application must rely on real data and streams with zero mocks or fake APIs.
* **Privacy:** A/V data must travel peer-to-peer and never be stored or recorded on an intermediate server.
* **Battery Optimization:** The Baby Device UI must support a low-power mode (e.g., dimmed screen) while the camera and microphone remain active in the browser.
* **Screen Wake Lock:** The Parent Device must request a Wake Lock to prevent the screen from sleeping during an active monitoring session. This ensures the parent does not return to a black screen while monitoring.
* **HTTPS Required:** The application must be served over HTTPS. Browser access to camera and microphone via `getUserMedia` is blocked on non-HTTPS origins; this is a hard platform requirement, not optional.

## 7. UI/UX States
* **Connected (Healthy):** Displays the live video and audio feed.
* **Reconnecting (Transient):** Silent UI indicator showing the app is negotiating a brief network drop.
* **Degraded (Low Bandwidth):** * **Visual:** Video is replaced by an active, animated audio waveform reacting to live sound.
    * **Transparency:** A timestamp notes exactly when the video signal dropped (e.g., *"Video signal dropped at 10:42 PM"*).
* **Critical / Interrupted (Total Failure) - Progressive Escalation:**
    * **0-10 Seconds:** Silent UI warning ("Reconnecting...").
    * **11-59 Seconds:** Soft, intermittent chime.
    * **60+ Seconds:** Full, loud, continuous alarm on the Parent Device requiring manual dismissal.

## 8. Out of Scope
* Full App Store readiness, authentication, or billing workflows.
* Landing pages, marketing materials, or full test coverage.

## 9. Success Gates
* **Gate 1:** Runs successfully on two real physical devices.
* **Gate 2:** Works flawlessly on the same Wi-Fi network.
* **Gate 3:** Works seamlessly across different networks.
* **Gate 4:** Relies on absolutely zero mocks or fake data.