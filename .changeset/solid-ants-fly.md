---
"@jilimb0/tgwrapper": minor
"@jilimb0/tgwrapper-adapter-redis": minor
"@jilimb0/tgwrapper-observability": minor
---

Release preparation for the next feature line with production-oriented DX improvements.

Core (`@jilimb0/tgwrapper`):
- add dual ESM/CJS package exports
- add `createBotClient` facade with lifecycle and event API
- expand typed high-level Telegram methods and bot-oriented exported types
- extend testkit with `MockBotClient`

Redis adapter (`@jilimb0/tgwrapper-adapter-redis`):
- add `RedisCacheStore` for JSON cache operations and namespace utilities
- add distributed rate limiter (`createRateLimiter`) with sliding window and block support
- add namespace factories for app-layer usage

Observability (`@jilimb0/tgwrapper-observability`):
- add `attachBotObservability` helper
- stabilize metrics snapshot schema with timestamp
- document stable utility APIs and redaction guidance

Docs:
- refresh bot development, migration, production checklist, and observability docs in English
