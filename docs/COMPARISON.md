# TGWrapper Comparison Matrix

You are probably here because you already have a Telegram bot in production - on Telegraf, grammY, or raw `node-telegram-bot-api` - and something is not working the way it should. Maybe sessions are losing updates under concurrent writes. Maybe you are debugging a production incident with `console.log` timestamps and no trace IDs. Maybe your rate limiter is an in-memory `Map` that resets every time a process restarts.

TGWrapper was built for that moment. It is not positioned as a universal replacement for every Telegram framework. It is optimized for teams that need explicit distributed-state contracts, structured observability, and deployment profiles they can explain during production review.

---

## Feature Comparison Matrix

| Feature | **TGWrapper** | **grammY** | **Telegraf** |
| :--- | :--- | :--- | :--- |
| **Primary focus** | Distributed ops, serverless, telemetry | Developer ergonomics, plugin ecosystem | Simplicity, Express-like middleware |
| **Session concurrency** | CAS (Compare-And-Swap); conflicts return `ok: false` | Usually last-write-wins unless custom storage logic is added | Usually last-write-wins unless custom storage logic is added |
| **Rate limiting** | Redis sliding window for shared fleet limits | Strong outgoing retry tooling; shared incoming limits require custom work | Manual / middleware-dependent |
| **Trace propagation** | Built-in update context in supported Node.js profiles | Middleware / integration-dependent | Middleware / integration-dependent |
| **Structured telemetry** | Built-in event schema, metrics registry, OTEL bridge | Integration-dependent | Integration-dependent |
| **Serverless fit** | Fetch-native core; capability-specific caveats | Supported with adapters/runtime choices | Primarily Node.js-oriented |
| **API type safety** | Full TS inference, schema drift detection on CI | Full TS inference | Partial |
| **Plugin ecosystem** | Small (Redis, observability) | Large (menus, conversations, storage adapters, etc.) | Medium |
| **Community size** | Small / early | Large / active | Large / established |
| **Runtime targets** | Node.js, Cloudflare Workers, AWS Lambda | Node.js, Deno, browsers | Node.js |

---

## Deep-Dive Comparisons

Each comparison is a standalone document with code side-by-side, decision guides, and honest trade-offs:

- **[Telegraf vs TGWrapper](./TELEGRAF_VS_TGWRAPPER.md)** — familiar middleware vs production contracts
- **[grammY vs TGWrapper](./GRAMMY_VS_TGWRAPPER.md)** — easy first vs explicit operations
- **[When Telegraf stops being enough](./WHEN_TELEGRAF_STOPS.md)** — scenarios where Telegraf needs additional operational design

---

## Decision Summary

| Your situation | Pick |
| :--- | :--- |
| Learning Telegram bots, want the smoothest path | **grammY** |
| Single-process bot, no ops requirements | **Telegraf** or **grammY** — both work well |
| Need distributed sessions with conflict detection | **TGWrapper** |
| Need structured traces and production metrics | **TGWrapper** |
| Need rich UI plugins (menus, conversations) | **grammY** |
| Deploying to edge/serverless | **TGWrapper** if your required capabilities are supported by the target runtime |
| AI-native bot with LLM tracing | **TGWrapper** |
| Legacy bot running stable, no reason to migrate | **Stay where you are** |

---

## Bottom line

**Telegraf** is the right choice for teams who want Express-like simplicity and have no distributed state or observability requirements. It is stable, well-known, and has years of production mileage.

**grammY** is the right choice for teams who want the best developer experience, the richest plugin ecosystem, and strong TypeScript types — on a single instance or with simple scaling needs.

**TGWrapper** is the right choice for teams who are past the "make it work" phase and are now dealing with "make it work predictably across instances, with traces, under load." It trades ecosystem breadth and convenience for distributed-state safety, architectural observability, and explicit failure contracts.

All three are legitimate tools. Pick the one that matches your pain, not the one with the most features.

---

## Migration Guides

- [Migration from Telegraf](./MIGRATION_FROM_TELEGRAF.md)
- [Migration from grammY](./MIGRATION_FROM_GRMMY.md)
- [Migration from python-telegram-bot](./MIGRATION_FROM_PYTHON.md)
- [Migration from Node Telegram Bot API](./MIGRATION_FROM_NODE_TELEGRAM_BOT_API.md)
