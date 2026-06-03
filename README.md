# TGWrapper

> A TypeScript framework built for production-oriented Telegram bot deployments, focusing on FSM resilience, transport portability, and structural request tracing.

[![npm version](https://img.shields.io/npm/v/@jilimb0/tgwrapper.svg)](https://www.npmjs.com/package/@jilimb0/tgwrapper)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

TGWrapper is designed for teams building structured Telegram applications where runtime flexibility, serverless support, and structured logs matter.

---

## 📈 Maturity & Stability Matrix

| Package | Current Stability | Adoption / Production Status | Runtime Target | API Stability |
| :--- | :--- | :--- | :--- | :--- |
| [**`@jilimb0/tgwrapper`**](./README.md) (Core) | `Early Production` | Used in active pilot apps; open for early testing. | Node.js, Cloudflare Workers, AWS Lambda | Stable core surface; minor enhancements ongoing. |
| [**`@jilimb0/tgwrapper-adapter-redis`**](./packages/adapter-redis/README.md) | `Early Production` | Tested under simulated high concurrency. | Redis server >= 6.2 | Stable API surface. |
| [**`@jilimb0/tgwrapper-observability`**](./packages/observability/README.md) | `Beta` | Undergoing active validation; feedback welcome. | Node.js AsyncLocalStorage | Evolving; minor trace schema updates possible. |

---

## 🚀 The Golden Path Onboarding (10-15 Minutes)

Deploying a production-ready Telegram bot follows a single, non-branching workflow:

1. **Install Core & Initialize:** Install the core package.
2. **Develop with Polling:** Create your bot using polling mode for rapid local iteration.
3. **Add State & Caching (Redis):** Plug in the Redis adapter for multi-instance persistence.
4. **Attach Telemetry:** Plug in observability to trace errors and metrics.
5. **Switch to Webhook & Deploy:** Toggle mode to `webhook` and export to serverless runtimes.

---

## ⚡ Quick Starts

Choose the canonical template that fits your project architecture:

### 1. Polling Bot (Best for Local Dev / Simple Bots)

```typescript
import { createBotClient } from '@jilimb0/tgwrapper';

const bot = createBotClient({
  token: process.env.BOT_TOKEN!,
  mode: 'polling',
  polling: { timeoutSeconds: 30, limit: 100 }
});

bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') return;
  if (message.text === '/start') {
    await bot.sendMessage(message.chat.id, 'Welcome to TGWrapper!');
    return;
  }
  await bot.sendMessage(message.chat.id, `Echo: ${message.text}`);
});

bot.on('error', (err) => console.error('Bot Error:', err));
await bot.start();
```

*For platform-specific serverless deployment templates, see:*
- Node HTTP Server: [`examples/node-http`](./examples/node-http)
- AWS Lambda Handler: [`examples/aws-lambda`](./examples/aws-lambda)
- Cloudflare Workers: [`examples/cloudflare-worker`](./examples/cloudflare-worker)

---

## 🛡️ Distributed Rate Limiting

> [!WARNING]
> The default `TokenBucketRateLimiter` included in the core package operates **in-memory**. It is designed solely for local development and single-instance applications.
>
> In multi-instance or serverless deployments, **you must switch to the distributed rate limiter** via the Redis adapter:

```typescript
import { RedisKvStore, createRateLimiter } from '@jilimb0/tgwrapper-adapter-redis';

const kv = new RedisKvStore({ redisUrl: process.env.REDIS_URL!, prefix: 'mybot' });
const limiter = createRateLimiter(kv, {
  namespace: 'spam-protection',
  windowMs: 60_000,
  limit: 20,
  blockDurationMs: 30_000
});
```

---

## 🛑 Limitations & Caveats

Before adopting TGWrapper, review the architectural boundaries of the core package:

* **No Built-in UI Builder:** Unlike heavy frameworks, TGWrapper does not contain custom templating DSLs or markup generators. You generate raw Telegram markdown/HTML payloads directly.
* **No Media Download/Upload Server:** The framework wraps standard multipart and file fetch API endpoints but does not ship with automatic file caching or download streaming proxies.
* **Single-threaded Polling Loop:** While webhook scaling is distributed, polling relies on a single loop. Large workloads on polling should switch to webhook ingestion.

---

## 🛡️ Evidence & Release Quality Gates

We back our quality claims with evidence-driven gates running on every commit:
- **Comprehensive Unit Tests:** 100% pass status on Vitest suite covering FSM state machines, routers, client endpoints, and update processing.
- **Auto Type-Drift Baseline Check:** Enforced via automated scripts checking code types against upstream Telegram API releases.
- **Bundle Budget Restrictions:** Monitored on build to keep cold-start latency low on edge platforms.

Verify validation checks locally:
```bash
pnpm install
pnpm build
pnpm test
```

---

## 📑 Core Documentation Index

- [Why TGWrapper?](./docs/WHY_TGWRAPPER.md) - Positioning and architectural wedge.
- [Comparison Matrix](./docs/COMPARISON.md) - TGWrapper vs. grammY vs. Telegraf.
- [Development Guide](./docs/BOT_DEVELOPMENT_GUIDE.md) - Bot architecture, middleware, routing.
- [Production Checklist](./docs/PRODUCTION_CHECKLIST.md) - Ensure reliability before launching.
- [Observability Guide](./docs/OBSERVABILITY_CONTRACT.md) - Monitoring best practices.
- [Migration Guide from grammY](./docs/MIGRATION_FROM_GRMMY.md) - Smooth codebase porting.
- [Migration Guide from Telegraf](./docs/MIGRATION_FROM_TELEGRAF.md) - Switch guidelines.
