# TGWrapper Documentation Platform Index

Welcome to the TGWrapper documentation hub. Use the index and FAQ below to navigate the architecture, design policies, and operational runbooks.

---

## ⚡ Decision Matrices

### 1. Polling vs. Webhook Transport Selection

| Feature / Factor | **Polling Mode** (`mode: 'polling'`) | **Webhook Mode** (`mode: 'webhook'`) |
| :--- | :--- | :--- |
| **Execution Pattern** | Background long-polling loops | Event-driven request ingestion |
| **Local Development** | Easiest (Zero setup, works behind NAT) | Requires HTTP tunnels (e.g., Ngrok) |
| **Infrastructure cost** | Requires continuous VM runtime | Scale-to-zero (Pay-per-request) |
| **Concurrency Scaling** | Hard (Requires single-instance locks) | High (Native HTTP routing scale) |

---

## 🙋 Central Platform FAQ

### Q1: Is Redis required?
**No**, Redis is optional. You can build and run fully functional bots using default in-memory setups.
* **When to add Redis:** As soon as you scale to multiple concurrent server instances or serverless containers. Redis acts as the synchronization layer for distributed rate limits and FSM user sessions (protecting state from concurrent updates).

### Q2: Is TGWrapper suitable for Serverless environments (AWS Lambda / Cloudflare Workers)?
**Yes, absolutely.** TGWrapper is built fetch-first with a very light bundle footprint. It contains no heavy legacy node dependencies, enabling minimal serverless cold starts.

### Q3: Why is TGWrapper better for AI-native bots?
1. **Concurrency Safety:** Multi-turn AI conversations involve delayed model replies. Concurrent buttons presses from users are safely guarded by the Redis Compare-And-Swap (CAS) session adapter, avoiding state overwrites.
2. **Context Correlation Tracing:** Downstream LLM calls and nested tool spans are mapped automatically to the incoming Telegram message trace ID via `AsyncLocalStorage`.

---

## 📑 Core Documentation Index

### Getting Started & Guides
- [Why TGWrapper?](./WHY_TGWRAPPER.md) - Positioning and architectural wedge.
- [Comparison Guide](./COMPARISON.md) - Deep feature comparison vs. grammY and Telegraf.
- [Bot Development Guide](./BOT_DEVELOPMENT_GUIDE.md) - Client parameters, session shapes, and commands.

### Migration Manuals
- [Migration from grammY](./MIGRATION_FROM_GRMMY.md) - Direct mapping guides.
- [Migration from Telegraf](./MIGRATION_FROM_TELEGRAF.md) - Interface mapper.
- [Migration from Node Telegram Bot API](./MIGRATION_FROM_NODE_TELEGRAM_BOT_API.md) - Legacy transition.

### Operational Runbooks
- [Production Stack Recipe](./PRODUCTION_STACK_RECIPE.md) - Blueprint stack layouts.
- [Production Checklist](./PRODUCTION_CHECKLIST.md) - Deployment audit items.
- [Operations Runbook](./OPERATIONS_RUNBOOK.md) - Debugging, logs, and alerts config.
- [Observability Contract](./OBSERVABILITY_CONTRACT.md) - Standard performance tags and logs.

### Architecture & Release Policy
- [Architecture Decision Records](./ARCHITECTURE_DECISIONS.md) - ADR repository log.
- [Telegram API Compatibility targets](./TELEGRAM_API_COMPATIBILITY.md) - Schema sync protocols.
- [Release Quality Gates](./RELEASE_POLICY.md) - Changesets validation.
- [1.0.0 Stable Release Plan](./RELEASE_1.0.0_PLAN.md) - Pre-release checklists.
