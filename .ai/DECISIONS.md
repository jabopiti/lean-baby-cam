# Decision Records

## Platform Selection
### Options Considered
- **Option A: Cross-platform (Native Mobile + Web App)**
  - *Pros:* Native streaming architecture ensures optimal performance and lower battery consumption.
  - *Cons:* Extremely complex and time-consuming to build and maintain multiple codebases.

- **Option B: Native App (iOS only)**
  - *Pros:* Highly optimized for Apple devices.
  - *Cons:* Blocked by a steep learning curve (no prior experience) and hardware limitations (requires a macOS machine).

- **Option C: Native App (iOS) + Web App**
  - *Pros:* Perfectly addresses the "home office" monitoring scenario alongside mobile tracking. 
  - *Cons:* Less complex than Option A, but still carries the heavy technical and hardware hurdles of Option B.

- **Option D: Web App (Progressive Web App / PWA)**
  - *Pros:* Simplest, fastest approach with a single codebase that works on any device (phone, tablet, or desktop).
  - *Cons:* Potentially higher battery drain and fewer system privileges (like background audio/video running while the phone is locked) compared to native apps.

## Decision
**Option D: Web App (Progressive Web App / PWA)**
Options requiring native iOS development are immediately blocked by a lack of experience and macOS hardware, while a full cross-platform approach is too complex for an initial launch. A Web App is the most pragmatic choice because it allows for rapid development and seamlessly solves the home-office use case. 
Crucially, by building it as a Progressive Web App (PWA), users can install it directly to their iOS or Android phone's home screen, providing a native-like app experience without the friction of App Store approvals.

# Device Pairing Mechanism
# Decision Record: Device Pairing Mechanism
## Options Considered
- **Option A: Shareable "Magic" Link (No Account)**
  - *Pros:* Minimum friction (one tap to connect), works flawlessly across different networks.
  - *Cons:* Lower security (anyone with the link can view) and pairing can be lost if browser cache is cleared.

- **Option B: Temporary PIN / Room Code (No Account)**
  - *Pros:* Familiar interaction, secure (requires physical presence), no personal data needed.
  - *Cons:* Manual typing adds friction, and connections can be fragile if the session drops.

- **Option C: QR Code Scan (No Account)**
  - *Pros:* Very fast, zero typing required, feels highly secure.
  - *Cons:* Fails completely if camera permissions are denied or broken, requires devices to be physically adjacent.

- **Option D: Lightweight Account (SSO or Email Magic Link)**
  - *Pros:* Most reliable connection across networks, persistent pairing, enables future premium features.
  - *Cons:* Highest initial setup friction (requires logging in twice), which can deter first-time users.

- **Option E: QR Code + Alternative PIN Fallback (No Account)**
  - *Pros:* Extremely fast primary pairing via scan, with a reliable manual fallback ensuring users are never stuck if camera access fails.
  - *Cons:* Devices still need to be physically next to each other for setup, and it requires designing a UI that handles two simultaneous pairing methods.

### Decision
**Option E: QR Code + Alternative PIN Fallback (No Account)**
This hybrid approach provides the perfect balance between zero-friction setup and reliability for a Web App. It allows for an instant, tap-free connection via QR scan, while the PIN provides a foolproof backup method if camera permissions are unavailable. 
We accept the tradeoff that this routing solution requires an active internet connection for the brief ~5-second initial setup handshake. Once paired, however, the app will fulfill the core architectural requirement of streaming securely directly over the local Wi-Fi network.

## UI Handling of "Degraded" State (Audio Only)
### Options Considered
- **Option A: The Active Waveform (Focus on Action)**
  - *Pros:* Dynamic, real-time waveform reacting to baby's sounds provides immediate proof the app is actively listening and not frozen.
  - *Cons:* Continuous animation may draw slightly more battery than a completely static screen.

- **Option B: The Blurred Snapshot (Focus on Context)**
  - *Pros:* Retaining a blurred version of the last frame keeps visual context and makes the transition less jarring.
  - *Cons:* A frozen image, even when blurred and overlaid with an icon, can easily be misinterpreted as a crashed app.

- **Option C: The Minimalist Night Mode (Focus on Battery/Calm)**
  - *Pros:* Excellent for battery saving and leans into a calm, non-intrusive nighttime experience.
  - *Cons:* A sudden cut to black risks inducing immediate parent panic before they read the small text.

### Decision
**Option A (Modified): The Active Waveform with Timestamp**
During a connection drop, parent panic is the biggest risk, so establishing immediate trust is critical. An active waveform reacting to the room's actual audio provides undeniable proof that the app is still alive and functioning. Adding a small, non-highlighted timestamp note ("Video signal dropped due to low bandwidth at `<timestamp>`") perfectly anchors the event, offering total transparency and reassuring the parent about exactly when the visual feed stopped.

## Handling Total Connection Drop
### Options Considered

- **Option A: The Strict Cutoff (High Safety, High Annoyance)**
  - *Pros:* Maximum safety, ensuring the parent knows almost instantly if the monitor goes offline.
  - *Cons:* Highly prone to false alarms; a minor 10-second Wi-Fi hiccup could unnecessarily wake the whole house.

- **Option B: The Generous Buffer (High Comfort, Lower Immediate Safety)**
  - *Pros:* Strongly adheres to "Silent Recovery," giving routers or network switches 45-60 seconds to resolve without disturbing the user.
  - *Cons:* Leaves the parent unmonitored for up to a minute without their knowledge.

- **Option C: Progressive Escalation (Balanced & Transparent)**
  - *Pros:* Gracefully handles both day and night monitoring by escalating from a silent UI warning (0-10s), to a soft chime (11-59s), and finally a loud manual alarm (60s+).
  - *Cons:* Requires a slightly more complex state machine to implement the staggered timing intervals.

### Decision
**Option C: Progressive Escalation (Balanced & Transparent)**
This approach provides the perfect balance between user comfort and vital safety. By escalating the alerts

## Defining MVP Scope & Feature Cutoff
### Options Considered

- **Option A: Feature-Rich MVP**
  - *Pros:* Highly competitive out of the gate, offering standard market features like recordings, multi-device management, and accounts.
  - *Cons:* Massive scope creep, significantly delayed launch, and introduces complex state management that threatens core reliability.

- **Option B: Balanced MVP (Core + Convenience)**
  - *Pros:* Includes quality-of-life features users expect, such as auto-reconnecting to previous devices or minor UX flourishes.
  - *Cons:* Still requires local storage management, complex flows, and distracts development focus from raw streaming stability.

- **Option C: Ultra-Lean MVP (Strictly Core Functionality)**
  - *Pros:* Hyper-focused on the primary goal (secure, reliable monitoring), fastest path to launch, and minimizes bug surface area.
  - *Cons:* Lacks standard convenience features, meaning users must perform manual steps (like pairing) every time they use it.

### Decision
**Option C: Ultra-Lean MVP (Strictly Core Functionality)**
To achieve a highly reliable and secure baby monitor, complexity must be ruthlessly minimized. By explicitly removing commercial elements, user identification, media recording, multi-device management, and convenience flows (like connection restoration) from the scope, we ensure the app remains the most simple, viable product possible. This strict focus guarantees that the core requirement—a simple, functional, and dependable audio/video stream—receives 100% of our engineering effort.

## Frontend Framework
### Options Considered
- **Option A: React**
  - *Pros:* Component-based architecture for managing complex UI states (Alarms/Reconnecting); huge library support for WebRTC hooks.
  - *Cons:* Slightly larger initial bundle size; requires a build step.
- **Option B: Vanilla JS**
  - *Pros:* Fastest possible load time; zero dependencies; works directly in any browser without a build step.
  - *Cons:* Manual DOM updates for the escalation logic can lead to "spaghetti code" as complexity grows.

### Decision
**Option A: React**
React was chosen to accelerate development using modern build tools (like Vite/Lovable) and to safely manage the multi-stage alarm escalation and connection states through predictable state hooks.

## STUN/TURN Provider
### Options Considered
- **Option A: Cloudflare Realtime (Calls)**
  - *Pros:* Cheap ($0.05/GB), highly reliable, massive global network.
  - *Cons:* Requires account setup and API key management.
- **Option B: Metered.ca / Open Relay**
  - *Pros:* Easy setup, free tier available.
  - *Cons:* TURN bandwidth is very limited on the free tier.
- **Option C: Google Public STUN**
  - *Pros:* Zero cost, zero setup, zero configuration needed.
  - *Cons:* No TURN support; will likely fail on cellular networks or restrictive Wi-Fi (violates Reliability Principle).

### Decision
**Option C: Google Public STUN**
Chosen for maximum simplicity during the initial build. 
**CRITICAL NOTE:** This decision knowingly compromises Gate 3 (Remote/Cloud reliability). If connection issues occur on different networks, this must be the first component upgraded to a TURN-capable provider.

**UPDATE (Post-Testing Correction):** As anticipated in the critical note, testing revealed that Google Public STUN was insufficient for connecting across different networks (Gate 3). Specifically, cellular connections (4G/5G) utilizing symmetric NAT completely blocked the peer-to-peer handshake. To resolve this and fulfill the core reliability requirement, the app was immediately upgraded to use a **Cloudflare TURN** server.

## Video Quality
### Options Considered
- **Option A: 720p (HD - 1280x720)**
  - *Pros:* Crisp, clear image; easier to monitor breathing and fine movements.
  - *Cons:* Higher battery drain and CPU heat; requires stable bandwidth.
- **Option B: 360p (SD - 640x360)**
  - *Pros:* More reliable on weak connections; minimal battery impact.
  - *Cons:* Grainy image; harder to see small details.

### Decision
- **Option B: 360p (SD - 640x360)**
360p is set as the default to balance a clear picture and batter life (10+ hours).
**Note:** While a manual quality toggle (720p vs 360p) is a desired feature for bandwidth management, it is officially **Out of Scope** for the initial MVP to keep the UI lean.

## Audio Configuration
### Options Considered
- **Option A: Processed Audio (Default)**
  - *Pros:* Removes background hiss/static; prevents feedback loops if devices are close together.
  - *Cons:* Noise suppression might occasionally "clip" very faint whimpering or breathing sounds.
- **Option B: Raw Audio**
  - *Pros:* Captures every single sound in the room; provides a more "natural" acoustic presence.
  - *Cons:* Constant static noise can be draining for parents; high risk of loud audio feedback.

### Decision
**Option A: Processed Audio**
Standard browser processing (Echo Cancellation and Noise Suppression) will be enabled by default to ensure a clean, hiss-free listening experience. **Note:** A "Pro Mode" or toggle to disable audio processing for raw sound capture is noted as a potential future enhancement but is out of scope for the MVP.

## Hosting & Signaling
### Options Considered
- **Option A: PeerJS Cloud (Zero Configuration)**
  - *Pros:* Truly zero setup; no backend code required; provides a free public signaling server out of the box.
  - *Cons:* Relies on a community-run public server; potential for downtime; no privacy control over the signaling handshake.
- **Option B: Firebase Realtime Database (Serverless signaling)**
  - *Pros:* Highly reliable; generous free tier; acts as a persistent "mailbox" for WebRTC offers/answers.
  - *Cons:* Requires setting up a Firebase project and basic configuration logic in the frontend.
- **Option C: Persistent VPS (Railway / Fly.io / Render)**
  - *Pros:* Total control over the Node.js/Socket.io signaling logic; consistent performance.
  - *Cons:* Often requires a credit card for "free" tiers; requires managing a Dockerfile or server environment.
- **Option D: Serverless + Third-Party Pub/Sub (Vercel + Pusher/Ably)**
  - *Pros:* Scales to zero; managed infrastructure.
  - *Cons:* Requires managing two separate services; more complex handshake logic.

### Decision
**Option A: PeerJS Cloud**
PeerJS Cloud was chosen for the MVP to achieve "Zero-Friction" development and eliminate the need for a custom backend or secret management. 
**CRITICAL NOTE:** This is a public, community-supported signaling server. For a production or "real-world" deployment, this must be replaced with a self-hosted PeerServer or a private signaling service to ensure reliability and data privacy during the initial connection phase.

## Hosting & Signaling
### Options Considered
- **Option A: PeerJS Cloud (Zero Configuration)**
  - *Pros:* Truly zero setup; no backend code required; provides a free public signaling server out of the box.
  - *Cons:* Relies on a community-run public server; potential for downtime; no privacy control over the signaling handshake.
- **Option B: Firebase Realtime Database (Serverless signaling)**
  - *Pros:* Highly reliable; generous free tier; acts as a persistent "mailbox" for WebRTC offers/answers.
  - *Cons:* Requires setting up a Firebase project and basic configuration logic in the frontend.
- **Option C: Persistent VPS (Railway / Fly.io / Render)**
  - *Pros:* Total control over the Node.js/Socket.io signaling logic; consistent performance.
  - *Cons:* Often requires a credit card for "free" tiers; requires managing a Dockerfile or server environment.
- **Option D: Serverless + Third-Party Pub/Sub (Vercel + Pusher/Ably)**
  - *Pros:* Scales to zero; managed infrastructure.
  - *Cons:* Requires managing two separate services; more complex handshake logic.

### Decision
**Option A: PeerJS Cloud**
PeerJS Cloud was chosen for the MVP to achieve "Zero-Friction" development and eliminate the need for a custom backend or secret management. 
**CRITICAL NOTE:** This is a public, community-supported signaling server. For a production or "real-world" deployment, this must be replaced with a self-hosted PeerServer or a private signaling service to ensure reliability and data privacy during the initial connection phase.

## Device Identification
### Options Considered
- **Option A: 6-Digit PIN Only**
  - *Pros:* Simplest UX; no local data storage required.
  - *Cons:* Vulnerable to "stray" pairings or accidental hijacking if a PIN is guessed during the signaling window.
- **Option B: PIN + Persistent UUID (localStorage)**
  - *Pros:* Significantly more secure; creates a "sticky" pairing between devices; prevents unauthorized devices from joining a session even if they know the PIN.
  - *Cons:* Requires logic to manage `localStorage` and a "Reset" flow for users who want to clear their device identity.

### Decision
**Option B: PIN + Persistent UUID (localStorage)**
The app will generate a unique UUID upon first launch and store it in the browser's `localStorage`. Pairing will require both a valid PIN and a handshake that verifies the unique device identity. This provides a necessary layer of security without adding friction to the user's daily experience.

## PWA Requirements
### Options Considered
- **Option A: Full PWA Implementation**
  - *Pros:* Allows "Installation" to the home screen; enables Full-Screen mode (hiding browser UI); provides more reliable access to the Wake Lock API to prevent the device from sleeping.
  - *Cons:* Requires a Service Worker and manifest file; slightly more complex deployment and caching logic.
- **Option B: Standard Web App**
  - *Pros:* Simplest possible development; no extra configuration files.
  - *Cons:* Browser address bar stays visible; device is prone to auto-sleeping or backgrounding the tab, which can kill the stream.

### Decision
**Option A: Full PWA Implementation**
We will implement a Progressive Web App (PWA) to ensure the Baby Device stays awake using the Wake Lock API and to provide a "hardware-like" full-screen experience. This directly supports the core principle of reliability by preventing the browser from suspending the stream during long monitoring sessions.

## Debugging View
### Options Considered
- **Option A: Hidden Technical Overlay**
  - *Pros:* Real-time visibility into WebRTC stats (latency, bitrate, ICE candidate type); essential for verifying Gate 2 and Gate 3.
  - *Cons:* Adds UI elements that need to be hidden/styled; requires polling the WebRTC API.
- **Option B: Console Logs Only**
  - *Pros:* No UI footprint.
  - *Cons:* Extremely difficult to debug on mobile devices or tablets where the browser console isn't easily accessible.

### Decision
**Option A: Hidden Technical Overlay**
A dedicated debugging panel will be implemented, accessible via a small, discrete, low-opacity button in the corner of the UI. This panel will display critical WebRTC health metrics to ensure the app meets its reliability and connectivity requirements during testing and real-world use.

We've tightened the bolts. By prioritizing battery longevity and ensuring the parent isn't left staring at a frozen screen, we’re moving closer to a product that actually earns a parent's trust.

Here is the confirmation of your first two decisions, followed by the Decision Records for the technical refinements.

## Heartbeat Monitor
### Options Considered
- **Option A: Native WebRTC State Monitoring**
  - *Pros:* No extra code; relies on standard browser events like `onconnectionstatechange`.
  - *Cons:* Often slow to react; fails to detect "frozen" video frames caused by iOS backgrounding.
- **Option B: 3-Second Active Heartbeat**
  - *Pros:* Detects "silent failures" almost instantly; provides data for the 60-second escalation alarm.
  - *Cons:* Requires constant background data transmission over the signaling/data channel.

### Decision
**Option B: Active Heartbeat Monitor**
A 3-second heartbeat was chosen to solve the "frozen frame" risk on mobile devices. By expecting a packet every 3 seconds, the Parent Device can immediately trigger a "Reconnecting" state if the stream is interrupted by the OS or network, ensuring the parent is never looking at a dead image.

## Audio Processing Logic
### Options Considered
- **Option A: Standard Browser Processing**
  - *Pros:* Cleanest possible sound; total removal of room hiss.
  - *Cons:* Risk of "cleaning" out vital sounds like breathing, stirring, or distant whimpering.
- **Option B: Hybrid Audio (NS Off / EC On)**
  - *Pros:* Prevents screeching feedback loops while ensuring the "room atmosphere" and faint baby sounds are preserved.
  - *Cons:* Results in a constant audible floor hiss that may be annoying to some parents.

### Decision
**Option B: Hybrid Audio Processing**
The system will explicitly disable Noise Suppression while keeping Echo Cancellation active. This ensures that faint or non-speech sounds (like breathing or rustling) are not filtered out by the browser, while still protecting the parent from painful audio feedback loops.

## Parent Dashboard UI
### Options Considered
- **Option A: Minimalist (Video Only)**
  - *Pros:* Zero distractions; prioritizes the visual feed.
  - *Cons:* Lack of "system heartbeat" awareness; parent doesn't know if silence is due to a quiet baby or a failed mic.
- **Option B: Full Dashboard (Audio levels, Signal, Session time)**
  - *Pros:* Provides high confidence; visual audio bars confirm the mic is working even in a quiet room.
  - *Cons:* More UI elements to manage in the layout.

### Decision
**Option B: Full Dashboard**
The Parent Device will display an audio-level indicator, connection strength/status, and the total elapsed session time. This ensures the parent has a clear, at-a-glance understanding of the monitoring health beyond just the video stream.

## Baby Device UI Status
### Options Considered
- **Option A: Blank / Black Screen**
  - *Pros:* Saves maximum battery; non-distracting in a dark room.
  - *Cons:* Hard to tell if the app crashed or if it is still monitoring.
- **Option B: Active Status Screen**
  - *Pros:* Immediate visual confirmation of "Monitoring Active"; includes mirrors of parent indicators and an emergency "End Session" button.
  - *Cons:* Slightly higher power draw than a black screen.

### Decision
**Option B: Active Status Screen**
The Baby Device will show a "Monitoring Active" status screen featuring the same health indicators as the parent device and a prominent "End Session" button. Interaction is intended only for the parent to terminate the session locally.

## Low-Power Mode Trigger
### Options Considered
- **Option A: Manual Dimming**
  - *Pros:* Total user control.
  - *Cons:* Easy to forget, leading to excessive battery drain or a bright screen keeping the baby awake.
- **Option B: Automatic Dimming**
  - *Pros:* "Set it and forget it" reliability; protects the device battery and room environment automatically.
  - *Cons:* May catch a user off-guard if they are still positioning the camera.

### Decision
**Option B: Automatic Dimming**
To support the "UX Focus" principle of fewer taps, the Baby Device screen will dim automatically after a short idle period (e.g., 30 seconds), ensuring power is conserved without manual intervention.

## Recovery UX Flow
### Options Considered
- **Option A: Manual Dismissal**
  - *Pros:* Forces the parent to acknowledge that a drop happened.
  - *Cons:* Frustrating if the connection is flickering; requires the parent to physically touch the phone to stop an alarm.
- **Option B: Automatic Recovery**
  - *Pros:* Alarm stops as soon as data flows; uses a transient message for transparency.
  - *Cons:* The parent might miss the fact that a brief interruption occurred.

### Decision
**Option B: Automatic Recovery**
When the connection is restored, the alarm will stop immediately. A "Connection Restored" message will appear on the Parent Device and automatically fade away after several seconds, adhering to the "Silent Recovery" principle.

## Remote Session Termination
### Options Considered
- **Option A: Manual Reset**
  - *Pros:* Prevents the device from being "ready" for a new session until a human checks it.
  - *Cons:* Requires a physical trip to the baby's room to reset the device for the next nap.
- **Option B: Auto-Return to Pairing**
  - *Pros:* Perfectly handles the "Zero-Friction" goal; the device is instantly ready for the next use.
  - *Cons:* None for this specific use case.

### Decision
**Option B: Auto-Return to Pairing**
If the session is ended from the Parent Device, the Baby Device will automatically terminate its tracks and return to the initial Pairing State (showing a new QR/PIN), making it ready for the next session without manual intervention.

## PIN Lifecycle
### Options Considered
- **Option A: Persistent PIN**
  - *Pros:* Easier to reconnect if the session drops.
  - *Cons:* Security risk; the same PIN could be used by someone else later if they saw it once.
- **Option B: Single-Use / Expiring PIN**
  - *Pros:* Maximizes privacy; ensures every session starts with a fresh, secure handshake.
  - *Cons:* Requires a new scan/entry if the session is fully ended and restarted.

### Decision
**Option B: Single-Use / Expiring PIN**
In alignment with the "Privacy First" principle, the 6-digit PIN will expire immediately once a session ends. Every new monitoring session will require a fresh pairing handshake.

## Strategic Foundations & Library Reuse
### Options Considered
- **Option A: Full Custom Implementation**
  - *Pros:* Total control over the signaling protocol and WebRTC handshake; zero dependency on third-party abstractions.
  - *Cons:* Extremely high development time; likely to reinvent "solved" bugs regarding ICE restarts and iOS backgrounding.
- **Option B: Strategic Foundation Reuse (React + PeerJS + ha-babycam)**
  - *Pros:* Drastically accelerates development; leverages proven "Never-Give-Up" reconnection patterns and iOS audio hacks; focuses effort on the "last mile" of UX and security.
  - *Cons:* Inherits the constraints of the chosen libraries and public signaling infrastructure.

### Decision
**Option B: Strategic Foundation Reuse**
The project will leverage a React (Vite) foundation for state management and PeerJS for simplified signaling. Crucially, the app will port proven reliability patterns from the `ha-babycam` project, specifically for **ICE Restart Loops** (auto-negotiation on network change) and **Track Monitoring** (using `onmute` events to detect frozen streams). Security patterns will be adapted from `gonimo`, utilizing a PIN + UUID identity lock before media tracks are fully exchanged.

## Design System & Styling
### Options Considered
- **Option A: Formal Design System (e.g., Tailwind + Shadcn/UI)**
  - *Pros:* Ensures perfect visual consistency; creates a scalable foundation for future features.
  - *Cons:* Significant initial setup time; requires manual configuration of themes, colors, and components.
- **Option B: AI-Generated UI (Ad-hoc Styling)**
  - *Pros:* Immediate results; allows for rapid prototyping; modern AI builders typically generate clean, functional, and accessible styles by default.
  - *Cons:* Higher risk of "visual debt" or slight inconsistencies as new screens are added later.

### Decision
**Option B: AI-Generated UI**
For the sake of speed and simplicity, no formal design system will be established. We will rely on the AI's default component styling (e.g., standard Tailwind or internal component libraries used by Lovable/Replit), as they provide a professional baseline that is sufficient for an MVP without the overhead of manual design system management.