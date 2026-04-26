# Experiment Details: AI-First Product Development

## Hypothesis & Learning Goals
**Hypothesis:** Can I build a real, secure, and functioning peer-to-peer baby monitor application from scratch within a strict **4-hour net working time** limit using an AI-first approach?

**Learning Goals:**
1. **Timeboxing AI:** Test if aggressive scoping and front-loaded context creation (PRD, Decisions) can keep AI code generation within the 4-hour limit without spiraling into endless iterations and debugging.
2. **Tool Stack Shift:** Evaluate a completely new AI toolchain. My usual stack is *Claude + Replit + Claude Code*. For this experiment, I intentionally shifted to **Gemini (Architecture/Reasoning) + Lovable (Code/UI Scaffolding) + Gemini Code Assist (IDE/CLI)** to compare capabilities, context retention, and execution speed.

## Approach
**Reasoning:** Clear, lean specifications are key for AI-first development. Front-loading the architectural and product thinking (Research, PRD, Tech Blueprint) prevents tedious iterations later. The trick is to establish specific but lean guardrails, giving the AI clear boundaries while leaving enough room for it to act. This prevents the AI from "hallucinating" (i.e., adding unwanted features that bloat the product, increasing complexity, or suggesting architecture that isn't feasible within the strict 4-hour timebox) and keeps it focused strictly on a "Zero-Friction MVP."

1. Run fast discovery
 - Review product challenge brief
 - Research market solutions for similar products
2. Create necessary context files
 - Product Requirements
 - Tech Brief
 - Development Blueprint
3. Build application based on specs
 - Craft initial prompt
4. Test and iterate
5. Document application and experiment results
 - Create setup / run guide
 - Create demo video (<10 min)
 - Create short note on approach and learnings

## Timebox Overview 
| Phase | Planned Time | Actual Time | AI Tools Used |
| :--- | :--- | :--- | :--- |
| 1. Fast Discovery | 10 mins | 6 mins | Perplexity, Gemini |
| 2. Context Creation | 90 mins | 110 mins | Gemini |
| 3. Build (Code Gen) | 90 mins | 110 mins | Lovable, Gemini |
| 4. Test & Iterate | 90 mins | [TODO] mins | Lovable, Gemini |
| 5. Documentation | [TODO] mins | [TODO] mins | - |

## Experiment Results & Learnings

### 1. What did you build, and why?
TODO

### 2. What did you intentionally not build, and why?
TODO

### 3. Where did AI help you concretely?
* **Perplexity:** Accelerated market research, instantly identifying the biggest user pain points (reliability and privacy) across top competitor apps.
* **Gemini:** Acted as a pairing partner to structure the PRD, evaluate architectural trade-offs (e.g., choosing a PWA over Native), and draft the initial prompt strategy.
* **Lovable:** Rapidly scaffolded the React/Vite application, styled the Tailwind UI components, and wrote the boilerplate WebRTC and PeerJS integration code much faster than I could manually.

### 4. Where did you deliberately correct, stop, or ignore AI?
* **Network Reality:** The AI initially suggested that Google Public STUN was sufficient for traversing symmetric NATs (cellular networks). I had to correct this and manually mandate the inclusion of a Cloudflare TURN server when testing revealed the app wouldn't connect across different networks (Gate 3).
* **Security Flaws:** The initial AI code generated a cryptographically weak PIN and failed to enforce brute-force locking on the client UI. I had to explicitly prompt it to run security scans and fix the identity handshake.
* **Context Blindness:** Lovable "hallucinated away" several critical requirements from the PRD, such as the diagnostics overlay, audio persistence, and the progressive FSM connection degradation logic. I had to manually audit the code against the PRD and force the AI to implement the missing layers.

### What would you build next with 1–2 experienced engineers?
Based on the initial market research and technical decisions, here are the features deliberately kept out of the MVP that would add significant value in future iterations:

#### Technical Debt & UI
1. **Private Signaling Server:** Replace the public `PeerJS Cloud` signaling server with a self-hosted implementation to guarantee absolute privacy during the initial connection handshake.
2. **Robust TURN Infrastructure:** Implement a scalable, premium TURN server setup to ensure unbreakable connectivity in restrictive corporate/hospital networks or poor cellular conditions.
3. **Formal Design System:** Migrate away from the AI-generated ad-hoc styling to a robust design system (like Shadcn/UI) for long-term maintainability.
4. **Advanced Media Handling:** Implement background audio processing (AudioContext) native hacks to ensure streams stay fully alive on iOS Safari even when the screen is locked.

#### User-Facing Controls
* **Manual Video Quality Toggle:** Allow users to switch between 360p (battery-saving default) and 720p HD depending on their network strength.
* **Audio "Pro Mode":** A toggle to completely disable the browser's echo cancellation and noise suppression to capture raw, unfiltered room sound.

#### Long-Term Product Differentiators
* **Family Sharing:** Support for multiple parent devices connecting to a single baby device simultaneously.
* **Activity Logs:** Session history and event logs (e.g., timestamps of when the baby was making noise or moving).
* **Wearable Integration:** Apple Watch or WearOS support for haptic alerts and quick-glance monitoring.
* **Offline/Bluetooth Resilience:** A fallback direct-connection method for when Wi-Fi/router access is completely unavailable (e.g., traveling or power outages).