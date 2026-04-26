# Product Challenge

## The Objective
The goal is to build a real, functioning baby monitor application that you would personally stand behind as a product builder.

## The Constraint
The entire project must be completed within a strict limit of **4 hours** of net working time.

## Purpose & Evaluation
This challenge is designed to: 
* **Ship a real working product quickly:** Move from concept to a functioning solution under pressure.
* **Leverage AI as a multiplier:** Effectively use AI tools to accelerate development and improve product quality.
* **Exercise Product Judgment:** Make pragmatic decisions and trade-offs when time is limited.
* **User-Centric Execution:** Remove friction, reduce uncertainty for the user, and build trust through reliable design.
* **Technical Resilience:** Demonstrate an understanding of product behavior during degradation and recovery.


## Product Idea: Real Baby Monitor

### 1. User Roles
The application must support two distinct roles operating on real, physical devices:
* **Baby Device:** The device situated with the child, responsible for sending real audio and video streams.
* **Parent Device:** The device used by the caregiver to monitor the baby. This device is responsible for starting the monitoring session.

### 2. Product Principles
The development process and user experience must be guided by the following core principles:
* **Reliability > Features:** Core functionality must be rock-solid before adding extras.
* **Privacy First:** Ensure data and streams are handled securely.
* **Silent Recovery > Loud Errors:** The app should handle connection hiccups gracefully without causing unnecessary user panic.
* **UX Focus:** Strive for fewer taps, less uncertainty, and more trust.

### 3. Mandatory Core Functionality
The application must execute the following without the use of mock data, fake streams, or stub APIs:
* **Device Pairing:** Establish a real pairing connection between the Baby Device and the Parent Device.
* **A/V Streaming:** Capture and transmit real audio and video from the physical Baby Device.
* **Local Network Support:** Audio and video must function seamlessly when both devices are on the same Wi-Fi network.
* **Remote/Cloud Support:** Audio and video must also function over the internet/cloud when the devices are on different networks (e.g., one on Wi-Fi, one on a cellular hotspot).

### 4. Product States & Behavior
Handling network conditions and device states is critical for building trust and reliability:
* **State Transparency:** The UI must display clear product states: connected, reconnecting, degraded, and critical/interrupted.
* **Audio Prioritization:** In the event of a degraded connection, the system must prioritize audio transmission; video should be dropped before audio to ensure the parent can still hear the baby.

### 5. Out of Scope (Not Required)
The following are explicitly excluded:
* Full App Store readiness (though TestFlight is acceptable).
* Complete authentication or billing workflows.
* Full test coverage.
* Landing pages, marketing pages, and sales materials (only the core application matters).

### 6. Development Guidelines
* Use of any AI tools, libraries and managed services are allowed.
* Existing code may be used as starting foundation.
* Seed or setup scripts are allowed as long as they generate real, persisted data.
* Project simplifications are permitted if they are consciously chosen and clearly explained.

### 7. Success Gates (Evaluation Criteria)
The final product must pass the following critical functional gates:
* **Gate 1:** Runs successfully on two real physical devices.
* **Gate 2:** Works flawlessly on the same Wi-Fi network.
* **Gate 3:** Works seamlessly across different networks.
* **Gate 4:** Relies on absolutely zero mocks or fake data.
