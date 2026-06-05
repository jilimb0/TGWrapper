# GTM Content Cadence & Calendar

This document defines the repeatable content calendar and publication schedules for the initial 90-day launch cycle of TGWrapper.

---

## 🔁 Content Cadence Policy

To build a repeatable acquisition engine, the content pipeline follows a monthly schedule:

- **2x Technical Deep-Dives:** In-depth technical articles focusing on core engineering problems (e.g. concurrency, tracing).
- **1x Migration or Comparison Guide:** Directly mapping the transition from competitive frameworks (Telegraf, grammY, Python).
- **1x Case Study or Release Story:** Showcasing how early adopters run TGWrapper in production.

---

## 📅 The 90-Day Publication Schedule

### Month 1: Launch & Core Value Proposition

- **Week 1: The Core Problem (Technical Deep-Dive)**
  - **Topic:** "Why standard Telegram bot sessions corrupt data at scale."
  - **Focus:** Explain LWW overwrite bugs and show how Compare-and-Swap (CAS) fixes it.
  - **Target Channels:** Habr, Dev.to, HackerNews, Reddit.
  - **Owner:** Core Maintainers.

- **Week 2: Comparison Guide**
  - **Topic:** "Telegraf vs. TGWrapper: Moving from magic context to typed architecture."
  - **Focus:** Structural code comparisons of routes, sessions, and telemetry hooks.
  - **Target Channels:** Dev.to, Medium.
  - **Owner:** Docs Contributors.

- **Week 3: Showcase Case Study**
  - **Topic:** "FinTech Alerting: How we solved double-spend webhook retries using TGWrapper."
  - **Focus:** Practical deployment metrics on Kubernetes, webhook retry abort signals.
  - **Target Channels:** Twitter/X Threads, GitHub Showcase.
  - **Owner:** GTM Team.

- **Week 4: Technical Deep-Dive**
  - **Topic:** "Telemetry-Driven Troubleshooting: Tracing Telegram updates across microservices."
  - **Focus:** Attaching trace IDs and routing logs via AsyncLocalStorage.
  - **Target Channels:** Dev.to, HackerNoon.
  - **Owner:** Core Maintainers.

---

### Month 2: Developer Activation & Growth

- **Week 5: Tutorial Ladder**
  - **Topic:** "Step-by-step: Building an AI-native helper bot with token metrics and abort controls."
  - **Focus:** OpenAI tool calling, rate limiting, and structured billing metrics.
  - **Target Channels:** Medium, Dev.to, YouTube code alongs.
  - **Owner:** Developer Relations.

- **Week 6: Migration Guide**
  - **Topic:** "Porting python-telegram-bot logic to TypeScript."
  - **Focus:** Moving from Python asyncio loop to Edge/Serverless node targets.
  - **Target Channels:** Reddit `r/typescript`, Medium.
  - **Owner:** Community Advocates.

- **Week 7: Ecosystem Showcase**
  - **Topic:** "Building custom storage plugins for TGWrapper (MongoDB & DynamoDB)."
  - **Focus:** Implementing the SessionAdapter interface and testing CAS scripts.
  - **Target Channels:** GitHub Discussions, Twitter/X.
  - **Owner:** Core Maintainers.

- **Week 8: Technical Deep-Dive**
  - **Topic:** "Low Latency Edge Bots: Measuring Cloudflare Workers startup and webhook latency."
  - **Focus:** V8 isolate tuning, bundle optimization.
  - **Target Channels:** Dev.to, HackerNoon.
  - **Owner:** Core Maintainers.

---

### Month 3: Scale & Retention

- **Week 9: Production Hardening**
  - **Topic:** "The 2026 Production Checklist: Rate limits, Sentinels, and webhook budgets."
  - **Focus:** Resiliency strategies, disaster drills.
  - **Target Channels:** Dev.to, GitHub docs.
  - **Owner:** Ops Contributors.

- **Week 10-12: Community Campaigns**
  - Focus on highlighting plugin contributors, user success stories, and reviewing core RFC feedback rounds.
