# FIFA StadiumOS 🚀
> **AI-Powered Tournament & Smart Stadium Operations Center (FIFA World Cup 2026)**

FIFA StadiumOS is an enterprise-grade, real-time command center designed to optimize stadium operations, transit, security, and fan logistics at scale for the FIFA World Cup 2026. Built with a client-first, zero-backend architecture, it features direct Google Gemini integration to provide operational intelligence, incident triaging, and multilingual emergency coordination.

---

## 🏗️ System Architecture
```
Fan Portal ─────┐
Volunteer ──────┼──> Web Dashboard ──> State Manager ──> Local telemetry / Canvas Map
Organizer ──────┘                                    ──> Gemini API (Session-only)
```

### Key Architectural Layers
*   **Security & RBAC Layer:** Enforces Role-Based Access Control (Fan, Volunteer, Organizer) to restrict critical operational dashboards and logs. Escapes all inputs for XSS protection and mocks rate limiting.
*   **AI Digital Twin:** Simulated real-time sensor streams mapping occupancy, queues, transit line loads, and sustainability outputs. Generates operational explanations via Google Gemini.
*   **AI Incident Commander:** Multi-tiered triaging tool that registers incidents, allocates resources, tracks timelines, and generates multilingual emergency safety broadcasts (in English, Spanish, French, Arabic, and Japanese) via GenAI.
*   **Interactive Navigator:** Canvas-based indoor stadium map supporting path computation, VIP corridor routing (RBAC restricted), and step-free accessibility overlays.
*   **Lighthouse 100 Accessibility:** Implements native focus rings, complete keyboard navigation support (`tabindex`), screen reader live regions (`aria-live="polite"`), text scaling sliders, and color-blindness color filters.

---

## 🛠️ Tech Stack & Folder Structure

*   **Frontend:** HTML5, CSS3 (CSS Variables, Transitions, Contrast Filters), Vanilla JS (ES6+ Modules)
*   **Testing:** Automated Browser VM mock runner (`tests/run_tests.js`)
*   **CI/CD:** GitHub Actions workflow (`validate.yml` running linting & tests)
*   **Containerization:** Docker (Nginx Alpine base)

```text
FIFA-StadiumOS/
├── .github/workflows/test.yml  # CI automated validation
├── frontend/
│   ├── index.html             # UI Dashboard shell
│   ├── styles.css             # Glassmorphism dark layout
│   └── src/                   # Core modules
│       ├── app.js             # Initialization & routing
│       ├── state.js           # Session API keys & telemetry store
│       ├── security.js        # Sanitizer, validation, and RBAC checks
│       ├── crowd.js           # Digital twin & queue predictions
│       ├── assistant.js       # Gemini API wrappers & Voice Assistant
│       ├── operations.js      # Incident dispatcher & emergency generator
│       ├── navigation.js      # Stadium mapping & path computation
│       ├── transport.js       # Transit status & parking gauges
│       ├── sustainability.js  # Waste tracking & eco advice
│       └── accessibility.js   # Contrast, color-blindness, & announcers
├── tests/
│   └── run_tests.js           # Lightweight unit test suite
├── package.json               # Package configuration
├── .eslintrc.json             # ESLint config (0 errors)
├── Dockerfile                 # Container setup
└── nginx.conf                 # Nginx server configs
```

---

## 🚦 Getting Started & Local Running

1.  **Clone or Copy** the folder structure to your machine.
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run ESLint Checks:**
    ```bash
    npm run lint
    ```
4.  **Run Test Suite:**
    ```bash
    npm test
    ```
5.  **Serve Locally:**
    Serve the `/frontend` directory using any local web server, for example:
    ```bash
    npx serve frontend
    ```
    Or run via Docker:
    ```bash
    docker build -t fifa-stadiumos .
    docker run -p 8080:8080 fifa-stadiumos
    ```

---

## 🔒 Security & API Compliance
To comply with security best practices, **API keys are never saved in `localStorage` or disk configs.** 
All user keys are processed strictly in-memory or in `sessionStorage` and are wiped instantly when the browser tab is closed. 
Audit logs tracks role elevations, API key changes, and permission blocks in real-time.

---

## ♿ Accessibility Suite
Lighthouse-grade accessibility is baked in:
*   Use the **Accessibility Settings** panel to increase text scale (100% to 150%) or toggle High Contrast mode.
*   Enable color-blind overrides (Deuteranopia, Protanopia, Tritanopia) to alter colors via CSS filter vectors.
*   Keyboard focus states are highly visible (`outline-offset: 2px`) for keyboard-only navigators.
*   Polite ARIA live region notifies screen readers of critical operations.
