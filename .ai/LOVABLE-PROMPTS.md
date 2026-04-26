# LOVABLE: Prompting Documentation

## Initial Prompt
**Role:** Act as a Senior Full-Stack Engineer and WebRTC specialist.

**Project Overview:** Build "Lean Baby Monitor," a high-reliability, zero-friction PWA for P2P WebRTC streaming. There are no accounts; the app uses a temporary PIN/QR handshake.

**Core Technical Stack:**
* **Frontend:** React (Vite) + Tailwind CSS + Lucide React.
* **Signaling:** PeerJS Cloud.
* **Connectivity:** WebRTC with Google Public STUN.

**Detailed UX Flows (Crucial):**
Please implement the following flows exactly as described in the attached `PRD.md`:
1.  **Role Selection Screen:** The entry point where the user chooses "I'm the Baby Device" or "I'm the Parent Device".
2.  **Session Initiation (Baby):** Request permissions, then display a fresh 6-digit PIN and QR code.
3.  **Session Initiation (Parent):** Scan QR or enter PIN to trigger the WebRTC handshake. Show a "Connecting..." indicator (under 3s).
4.  **Active Monitoring UI:** * **Baby side:** Show audio-level indicator and "End Session." Dim screen after 30s.
    * **Parent side:** Live video feed with an overlaid audio-level indicator and session timer. 
5.  **Connection Degradation (FSM Logic):** * **0–10s:** Silent "Reconnecting..." banner.
    * **11–59s:** Keep "Reconnecting" banner and start a soft, intermittent chime.
    * **60s+:** Full, continuous alarm requiring manual dismissal.
    * **Low Bandwidth Rule:** If bandwidth is low, programmatically drop video and show an animated audio waveform with a "Video signal dropped at [timestamp]" message.
6.  **Connection Recovery:** Automatically stop alarms and restore video/audio when the connection returns.
7.  **Safe Termination:** A "Yes, End Session" button that is disabled for a 2-second visual countdown to prevent accidental taps.

**Engineering Standards:**
* **Media:** Hard-code **480p/15fps**. Enable echo cancellation but **disable** noise suppression.
* **Battery:** Implement the **Screen Wake Lock API** for both devices.
* **Cleanup:** Explicitly call `track.stop()` on all media tracks during session termination.

**Next Steps:**
Please review `PRD.md`, `TECH.md`, and `TECH-BLUEPRINT.md`. Provide a brief summary of how you will handle the 3-second heartbeat logic before you begin generating code.

### Questions & Answers
**Which QR scanner should the Parent Device use? (PIN entry is always available as fallback either way.)**
html5-qrcode

**How should the 3-second heartbeat be implemented? This affects how 'connection lost' is detected.**
WebRTC stats + DataChannel

**Where should the soft chime and loud alarm audio come from?**
Generate via Web Audio API

**How far should we go with PWA features in this first version?**
Full PWA with offline SW

**AFTER FIRST IMPLEMENTATION: Want me to add the SW now (with iframe/preview guards as described), so it activates only on the published URL?**
Add the SW now (with iframe/preview guards as described)


## Following Prompts
- Security Scan -> Fix Brute-Force PIN Locked Enforced Only in Client UI & Cryptographically Weak PIN Generation

- Issue: Not connecting when not on same wifi -> Why? Cellular (4G/5G) usually has symmetric NAT which is one of the "few cases" that AI stated require TURN but are not affecting the app design. Turns out it does -> Solution: Add TURN server with Cloudflare 

- Issue: Missing stats overlay -> Why? Lovable missed it -> Why? "Hidden & fragemented" in MDs -> Solution: Check implementation against requirements -> Missing implementations: resilience & audio persistence, diagnostics overlay, rate limit, inline retry button, basic test setup -> Solution: Create implementation plan and execute

- Issue: Hard to identify connection type in stats overlay -> Why? Types are shown as Jargon (host, srflx, relay) -> Solution: Human-readable connection route