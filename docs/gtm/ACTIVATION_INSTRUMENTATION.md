# Docs Activation Instrumentation Plan

This document details the instrumentation strategy to measure developer onboarding conversions and identify drop-off points across our documentation.

---

## 🔒 Privacy-First Compliance

We do not collect personal data, IP addresses, or telemetry from running bot processes.
All metrics are collected strictly at the **documentation level** (visitor behavior on GitHub Pages or the documentation hub) using privacy-safe web analytics solutions (e.g., [Plausible Analytics](https://plausible.io/) or [Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/)).

---

## 📐 Funnel Metrics & Conversion Targets

We monitor four core user actions to measure documentation conversion rates:

### 1. The Quick Start Entry
- **Metric:** Page views on `docs/QUICK_START.md`.
- **Goal:** Drive top-of-funnel traffic to read the basic polling guide.
- **Conversion Target:** >40% of visitors landing on the README click to view the Quick Start.

### 2. Sandbox Verification
- **Metric:** Download/Clone clicks on the `examples/polling-starter` and `examples/standard-bot` directories.
- **Goal:** Verify that developers are copying templates to run locally.
- **Conversion Target:** >10% of Quick Start readers download or clone a template.

### 3. Production Path Upgrade
- **Metric:** Page views on `docs/GROW_WITH_TGWRAPPER.md` and `docs/MIGRATION_FROM_TELEGRAF.md`.
- **Goal:** Track transition from local polling test bot to production architectures.
- **Conversion Target:** >25% of trial developers check the migration/growth guides.

---

## 🚀 Instrumentation Setup

To deploy this tracking on our documentation portal:
1. Embed the lightweight analytics script into the header template:
   ```html
   <script defer data-domain="tgwrapper.org" src="https://plausible.io/js/script.js"></script>
   ```
2. Set up Custom Goal Triggers matching documentation link clicks:
   - `Click - Quick Start`
   - `Click - Standard Bot Clone`
   - `Click - Migration Guide`
