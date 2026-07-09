---
"@tgwrapper/core": minor
"@tgwrapper/adapter-dynamodb": minor
"@tgwrapper/adapter-mongodb": minor
---

feat: ecosystem expansion — middleware chain, DynamoDB/MongoDB adapters, webhook debugger

- Adds global and per-route middleware pipeline with `useMiddleware()` and `Middleware<TContext>` type
- Adds `@tgwrapper/adapter-dynamodb` — DynamoDB session storage with CAS via condition expressions
- Adds `@tgwrapper/adapter-mongodb` — MongoDB session storage with CAS via findOneAndUpdate
- Adds `WebhookDebugger` — opt-in dev tool with ring buffer and HTML inspection page
