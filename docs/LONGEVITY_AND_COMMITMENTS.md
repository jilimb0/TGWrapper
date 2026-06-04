# Project Longevity & Commitments

This document outlines TGWrapper's long-term commitments, compatibility policies, and development horizons to reassure teams adopting the framework in production.

---

## 🛡️ Core Commitments

TGWrapper is built as a permanent, reliable piece of infrastructure. We commit to:

- **Upstream Synchronization:** We track official Telegram Bot API type schemas. Automated watchdog baseline scripts run weekly to flag type delta adjustments and prevent drift.
- **Backward Compatibility Horizon:** Critical runtime handler APIs (`createBotClient`, update session signatures, and telemetry contracts) are stable. We avoid API redesign iterations that require code rewrites.
- **No Hidden Fees / Open Core Boundaries:** All core libraries (`@tgwrapper/core`, `@tgwrapper/adapter-redis`, and `@tgwrapper/observability`) will remain open-source and free under the Apache 2.0 License.

---

## 📈 Horizon & Maintenance Cycles

- **API Deprecation Window:** Features marked as deprecated will remain functional for at least one minor version cycle before removal.
- **Node.js LTS Tracking:** We guarantee active support for the latest three Node.js Long Term Support (LTS) releases (refer to [COMPATIBILITY.md](./COMPATIBILITY.md)).
- **LTS Releases:** Upon reaching `v1.0.0`, each major version will receive security patches and baseline drift updates for a minimum of 18 months.
