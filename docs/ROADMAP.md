# TGWrapper Public Roadmap

This document outlines the development phases, goals, and targets for the TGWrapper Telegram platform.

---

## 🗺️ Roadmap Phases

```mermaid
gantt
    title TGWrapper Platform Roadmap
    dateFormat  YYYY-MM
    section Phase 1: Core Stabilize
    FSM & Polling Updates     :active, 2026-05, 2026-06
    section Phase 2: Distributed Ops
    Redis CAS & Limits        :active, 2026-06, 2026-07
    OpenTelemetry Integrations: 2026-07, 2026-08
    section Phase 3: Scaling & SDK
    Edge Webhooks Optimization: 2026-08, 2026-09
    Showcase Starter Assets   : 2026-09, 2026-10
```

---

## 🎯 Development Priorities

### Phase 1: Core Stabilize (Current Focus)
- Validate 100% test coverage boundaries.
- Track Telegram Bot API schema drift automatically.
- Maintain dual ESM/CommonJS distribution.

### Phase 2: Distributed Operations
- Improve Redis CAS performance under contention.
- Refine span nesting and propagation scopes.
- Standardize `/metrics` endpoint exports.

### Phase 3: Scaling & SDK
- Expand documentation and migration guides for other language ecosystems (e.g. Python, Go).
- Establish early adopter user groups and community channels.
