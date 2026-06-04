# Category Memory & Branding Guidelines

To establish a clear identity in the developer ecosystem, TGWrapper enforces a single canonical positioning line across all communication channels (README, docs intro, releases, comparison pages).

---

## 🎯 The Canonical Positioning Line

> **"TGWrapper: A TypeScript framework for production Telegram bots with Redis state, observability, and reliability semantics built in."**

---

## 🧠 Why This Messaging Matters

Our positioning line directly addresses the gap left by other popular libraries:

- **"TypeScript framework"** — We build exclusively for the TS/JS ecosystem, optimizing for strict contracts and edge compatibility. We do not try to be multi-language.
- **"production Telegram bots"** — We are not aiming for the "hello-world in 30 seconds" market. Our features are designed for services running live users under high loads.
- **"Redis state"** — Focuses on solving the concurrent session overwrite problem that plagues in-memory or naive Redis setups.
- **"observability"** — Emphasizes built-in correlation tracing (`trace_id`, `span_id`), making production debugging painless.
- **"reliability semantics"** — Highlights that handling edge-case behaviors (webhook budgets, client rate limits, connection failures) is integrated into the core architecture.

---

## 📝 Usage Across Channels

Apply the positioning line consistently in these key areas:

### 1. Repository Headers & Package Managers (README, npm descriptions)
Use the canonical tagline immediately following the repository title. Do not dilute it with generic lists of API wraps.

### 2. Launch Announcement Templates
Start all Hacker News, Reddit, and community launch threads with:
*"We built TGWrapper because we were tired of debugging concurrent session conflicts and tracing errors in our production bots. It's a TypeScript framework built with Redis state, observability, and reliability semantics at its core."*

### 3. Release Notes & Changelogs
End each release note with a reference to our positioning statement to remind users of the project's long-term focus.
