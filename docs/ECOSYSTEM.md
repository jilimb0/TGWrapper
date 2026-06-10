# TGWrapper Ecosystem Hub

This document catalogs all official packages, templates, examples, and community-driven integrations within the TGWrapper ecosystem.

---

## 📦 Official Packages

Official modules maintained in the core monorepo:

| Package                                                               | Purpose                                                               | Target Runtimes                         | Status                                          |
| :-------------------------------------------------------------------- | :-------------------------------------------------------------------- | :-------------------------------------- | :---------------------------------------------- |
| [**`@tgwrapper/core`**](../README.md)                                 | Framework core, client, update router, basic polling & webhook hooks. | Node.js, Cloudflare Workers, AWS Lambda | See [docs/API_STABILITY.md](./API_STABILITY.md) |
| [**`@tgwrapper/adapter-redis`**](../packages/adapter-redis/README.md) | Redis CAS session store and sliding window rate limiter.              | Redis Server >= 6.2                     | See [docs/API_STABILITY.md](./API_STABILITY.md) |
| [**`@tgwrapper/observability`**](../packages/observability/README.md) | OpenTelemetry spans, trace propagation, structured logging.           | Node.js AsyncLocalStorage               | See [docs/API_STABILITY.md](./API_STABILITY.md) |

---

## 🚀 Starter Templates & Examples

Ready-to-deploy codebases for various architectures:

- **[Polling Starter](../examples/polling-starter/)** — Barebones long-polling bot for rapid local prototyping.
- **[Multi-Instance + Redis](../examples/multi-instance-redis-starter/)** — Polling architecture backed by Redis session storage. Shows safe concurrent mutations.
- **[Serverless Webhook](../examples/serverless-webhook-starter/)** — Deployable package for serverless functions (AWS Lambda, Cloudflare Workers).
- **[AI Bot Starter](../examples/ai-bot-starter/)** — Advanced LLM conversational assistant. Shows AbortSignals, trace context, and token usage metrics.
- **[Migration Starter](../examples/migration-starter/)** — Side-by-side transition blueprint from Telegraf to TGWrapper.
- **[Standard Bot Template](../examples/standard-bot/)** [NEW] — Recommended blueprint bot combining core client, single Redis instance, and observability modules.

---

## 🔌 Third-Party & Community Integrations

We support and catalog integrations built by the developer community.

### Planned / Upcoming Adapters

- **`tgwrapper-adapter-mongodb`** — Optimistic-locking document session store.
- **`tgwrapper-adapter-dynamodb`** — AWS-native session adapter using partition-key locking.
- **`tgwrapper-adapter-postgresql`** — Relational database session store using transactional CAS logic.

---

## 📣 Adding Your Project to the Ecosystem

If you have built an adapter, plugin, or a starter template for TGWrapper:

1. Open a Pull Request adding your project to the table above.
2. Tag your repository with the `tgwrapper` topic on GitHub.
3. Share your launch in the [Community Discussions](https://github.com/jilimb0/tgwrapper/discussions/categories/show-and-tell).
