# Project Sustainability Options Memo

This memo evaluates long-term sustainability models for TGWrapper, outlining open-core boundaries and commercial support options.

---

## 🛡️ The Open-Core Boundaries

We maintain a strict boundary defining what must remain free and open-source:
- **Core Engine:** `@tgwrapper/core` client runtime will always remain fully open-source.
- **Reference Adapters:** Core Redis sessions (`@tgwrapper/adapter-redis`) and OpenTelemetry hooks (`@tgwrapper/observability`) are first-party and open.
- **Documentation:** All guides, comparison sheets, and checklists remain open-access.

---

## 💼 Sustainability Options Matrix

We evaluate four models to fund ongoing maintenance:

### 1. Developer Support Subscriptions (Best Effort)
- **Model:** Open a GitHub Sponsors or OpenCollective program.
- **Target:** Individual developer advocates and teams wanting to support maintenance.
- **Benefit:** Direct community-driven funding with low administrative overhead.

### 2. Enterprise Support Plans & SLA Agreements
- **Model:** Paid support contracts for teams running mission-critical bots.
- **Target:** FinTech, E-Commerce, and Enterprise AI companies.
- **Offering:** Guaranteed response time SLAs (e.g. <24-hour patch turnaround), private security advisories.

### 3. Professional Consulting (Migration Audits)
- **Model:** Time-and-materials migration consulting.
- **Target:** Engineering teams migrating high-traffic bots from legacy Telegraf/Python codebases.
- **Offering:** Maintainer-guided architecture review, custom adapter integration, and stress tests.

### 4. Managed Hosted Control Plane (Long-term)
- **Model:** Cloud hosting platform (e.g. hosted state synchronization, dashboard monitoring endpoints).
- **Target:** Serverless and edge bot deployments.
- **Offering:** Zero-ops Redis state clusters, live tracing dashboards, and centralized webhook retry dead-letter queues.
