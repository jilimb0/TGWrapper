# TGWrapper Comparison Matrix & Positioning

TGWrapper is built for teams running production-grade, distributed, or serverless Telegram bots in TypeScript where observability, uptime, and strict API compatibility matter.

---

## 📊 Comparison Table

| Feature / Metric | **TGWrapper** | **grammY** | **Telegraf** |
| :--- | :--- | :--- | :--- |
| **Primary Niche** | AI-Native, Distributed, & Serverless Production Bots | General ergonomics, large plugin ecosystem | Legacy codebase maintenance, legacy setups |
| **Serverless Cold Starts** | **Extremely Low** (Fetch-first, zero dependency runtime) | Moderate (Requires adapter shims) | High (Heavy HTTP/CJS abstractions) |
| **API Drift Guardrail** | **Strict CI Baseline Checks** (Schema-drift gates) | None (Manual type updates on release) | None (Manual updates) |
| **First-Party Redis Storage** | **Native versioned sessions (CAS) & Rate limiter** | External community plugins | External plugins |
| **Trace Correlation** | **Built-in AsyncLocalStorage tracing spans** | Manual middleware logging | Manual tracking |
| **Multi-instance locking** | **Compare-And-Swap (CAS)** (No state overwriting) | None (Last write wins) | None (Last write wins) |

---

## 🎯 Architectural Wedges (Why Switch?)

### 1. No More Stale State Overwrites (Compare-and-Swap Sessions)
- **Traditional Frameworks:** When two Telegram updates arrive simultaneously for the same user, standard Redis session plugins retrieve, update, and write back the session. The second write completely overwrites the changes of the first write (lost update problem).
- **TGWrapper Solution:** The `@jilimb0/tgwrapper-adapter-redis` package enforces **optimistic concurrency control** via version matching (`compareAndSet`). If a write conflict is detected, the transaction fails safely rather than silently corrupting user session data.

### 2. Built-in Observability
- **Traditional Frameworks:** Logging and metrics require custom middleware loops wrapping request blocks.
- **TGWrapper Solution:** Deep integration with AsyncLocalStorage ties all logs, database calls, rate limiter checks, and AI completions to a single request correlation ID (`traceparent` format). Out-of-the-box Prometheus exports make monitoring trivial.

### 3. Serverless Edge Compatibility
- **Traditional Frameworks:** Heavily bound to standard Node.js server paradigms (like `http.IncomingMessage`). Running on AWS Lambda or Cloudflare Workers requires complex adapter translation blocks.
- **TGWrapper Solution:** Designed fetch-first. Can ingest native requests and execute inside isolate sandboxes with negligible memory overhead.

---

## 🛠️ Transition Guides

- [Migration from grammY](./MIGRATION_FROM_GRMMY.md)
- [Migration from Telegraf](./MIGRATION_FROM_TELEGRAF.md)
- [Migration from node-telegram-bot-api](./MIGRATION_FROM_NODE_TELEGRAM_BOT_API.md)
