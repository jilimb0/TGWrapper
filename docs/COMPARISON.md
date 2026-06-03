# TGWrapper Comparison Matrix & Positioning

TGWrapper is built for teams designing serverless, edge-native, or distributed Telegram bots in TypeScript where structured logging, request trace correlation, and type validation are priority requirements.

---

## 📊 Comparison Matrix

| Feature / Metric | **TGWrapper** | **grammY** | **Telegraf** |
| :--- | :--- | :--- | :--- |
| **Primary Focus** | Distributed scaling, serverless layouts, and telemetry | General developer ergonomics & extensive plugins | General-purpose setups, legacy JS/TS codebases |
| **Serverless Cold Starts** | **Low** (Built on native fetch APIs) | Moderate (Requires adapter translation shims) | Moderate (Includes standard Node.js server dependencies) |
| **API Type Updates** | Checked against Telegram schemas | Handled manually on major releases | Handled manually |
| **Redis Session Protection** | **Compare-And-Swap (CAS)** (Prevents state overwrite) | Default key overrides (Last write wins) | Default key overrides (Last write wins) |
| **Trace Propagation** | **Built-in AsyncLocalStorage contexts** | Requires manual middleware setup | Requires manual middleware setup |

---

## 🎯 Key Architectural Differences

### 1. Concurrency Safety in User Sessions
* **Standard Plugins:** When concurrent Telegram updates arrive for the same user, standard Redis session managers read, modify, and write the session key sequentially. Under high button-press rates (e.g. FSM flows), the latter write overwrites previous state updates (stale write condition).
* **TGWrapper Solution:** The `@jilimb0/tgwrapper-adapter-redis` module offers **optimistic concurrency control** using version matching (`compareAndSet`). If a write conflict is encountered, developers can catch the event and retry rather than silently losing user inputs.

### 2. Built-in Telemetry Contexts
* **Standard Frameworks:** Logging request paths or metrics requires custom wrapper middleware.
* **TGWrapper Solution:** Tracing utilities correlate operations (rate limits, database checks, API requests) to a standard correlation context (`traceparent` formatting), making production monitoring simpler.

---

## 🛠️ Transition Guides

- [Migration from grammY](./MIGRATION_FROM_GRMMY.md)
- [Migration from Telegraf](./MIGRATION_FROM_TELEGRAF.md)
- [Migration from Node Telegram Bot API](./MIGRATION_FROM_NODE_TELEGRAM_BOT_API.md)
