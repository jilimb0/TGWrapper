# Go-to-Market Funnel Metrics Model

This document establishes the telemetry taxonomy and tracking metrics for measuring the developer adoption funnel of TGWrapper.

---

## 📊 The GTM Funnel Metrics Map

We track the health of developer adoption across five standard funnel stages:

```
   [ Awareness ]   --->  Web visitors, search impressions
         │
   [  Interest ]   --->  Comparison page visits, documentation read-time
         │
   [   Trial   ]   --->  Cloned template starters, quick start completion
         │
   [  Adoption ]   --->  Production pilots, migration cases, Redis adapter use
         │
   [  Advocacy ]   --->  Github contributions, shared ecosystem plugins
```

---

## 1. Funnel Stages Definition & Key Performance Indicators (KPIs)

### 📢 Stage 1: Awareness (Top of Funnel)
- **Goal:** Reach senior TypeScript and Python backend developers running bots.
- **Metric Definitions:**
  - **Site/Docs Unique Visitors:** Monthly unique visits to `README.md` and GitHub page assets.
  - **Search Impressions:** Search query ranking hits for "TypeScript telegram bot framework," "Telegraf concurrent session error," and "telegram bot Redis state."
  - **Direct Referrals:** Clicks originating from launch post citations (Reddit, HN, Dev.to).

### 🔍 Stage 2: Interest (Evaluation)
- **Goal:** Drive visitors to evaluate why TGWrapper is better for production workloads.
- **Metric Definitions:**
  - **Comparison Pages Read Rate:** Visits and bounce rates on `docs/WHEN_TELEGRAF_STOPS.md` and `docs/CODE_COMPARISONS.md`.
  - **Average Session Time:** Time spent analyzing core architecture guarantees in `docs/WHY_TGWRAPPER.md`.

### 🧪 Stage 3: Trial (First Success)
- **Goal:** Get developers to run the 5-minute Quick Start locally.
- **Metric Definitions:**
  - **Quick Start Completers:** Unique clicks on the `docs/QUICK_START.md` link.
  - **Starter Template Clones:** Git clone counts for `examples/polling-starter` and `examples/standard-bot`.

### 🚀 Stage 4: Adoption (Production)
- **Goal:** Help teams run internal pilots and migrate production bots.
- **Metric Definitions:**
  - **Active Migration Help Tickets:** Migration help queries opened in GitHub Discussions or Issues.
  - **Production Signals:** Production project mentions, use of `@jilimb0/tgwrapper-adapter-redis` in live builds, and case studies.

### 🌟 Stage 5: Advocacy (Flywheel)
- **Goal:** Turn users into contributors and advocates.
- **Metric Definitions:**
  - **Community Contributed Plugins:** Integrations/adapters created outside the core organization.
  - **Showcase Stories:** Success stories submitted in GitHub Discussions.
  - **External Mention Shares:** Blog citations, social posts, or ecosystem recommendations.

---

## 🛠️ Data Collection Policy

- **No Invasive Analytics:** We do not track individual developer updates, tokens, or bot interactions.
- **Privacy-First Web Metrics:** Use lightweight, GDPR-compliant, privacy-safe analytics platforms (such as Plausible) to monitor documentation page conversions.
