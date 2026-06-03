# TGWrapper

> Production-grade, serverless-first Telegram bot framework for TypeScript focused on resilience, type safety, and deep observability.

[![npm version](https://img.shields.io/npm/v/@jilimb0/tgwrapper.svg)](https://www.npmjs.com/package/@jilimb0/tgwrapper)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

TGWrapper is engineered for teams shipping serious Telegram applications where uptime, multi-runtime compatibility, and execution tracing matter more than basic scripts.

---

## 📦 Packages

The TGWrapper ecosystem is modular and built to scale from local development to distributed clouds:

| Package | Purpose | Stability |
| :--- | :--- | :--- |
| [**`@jilimb0/tgwrapper`**](./README.md) (Core) | Core client, router, FSM, and transport engine. | `Stable` |
| [**`@jilimb0/tgwrapper-adapter-redis`**](./packages/adapter-redis/README.md) | Distributed sessions, namespaces, and rate limiters. | `Stable` |
| [**`@jilimb0/tgwrapper-observability`**](./packages/observability/README.md) | Telemetry, async request tracing, metrics, and structured logs. | `Stable` |

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

// Message listener
bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') return;

  if (message.text === '/start') {
    await bot.sendMessage(message.chat.id, 'Welcome to TGWrapper!');
    return;
  }

  await bot.sendMessage(message.chat.id, `Echo: ${message.text}`);
});

bot.on('error', (err) => console.error('Bot Error:', err));

// Start Polling Loop
await bot.start();
```

---

### 2. Webhook Bot (Best for Serverless & Production)

Run on AWS Lambda, Cloudflare Workers, or standard Node HTTP servers.

```typescript
import { createBotClient } from '@jilimb0/tgwrapper';

const bot = createBotClient({
  token: process.env.BOT_TOKEN!,
  mode: 'webhook'
});

await bot.start();

// Standard serverless entrypoint
export async function handleWebhook(update: unknown): Promise<void> {
  await bot.ingest(update);
}
```

*For platform-specific deployment templates, see:*
- Node HTTP Server: [`examples/node-http`](./examples/node-http)
- AWS Lambda Handler: [`examples/aws-lambda`](./examples/aws-lambda)
- Cloudflare Workers: [`examples/cloudflare-worker`](./examples/cloudflare-worker)

---

### 3. AI Bot (Best for LLM & Conversational Assistants)

Use the built-in FSM state handling and observability to trace model interactions.

```typescript
import { createBotClient } from '@jilimb0/tgwrapper';

const bot = createBotClient({
  token: process.env.BOT_TOKEN!,
  mode: 'polling'
});

bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') return;

  // Simulate LLM Call with Context tracing
  const reply = await mockLLMCall(message.text);
  await bot.sendMessage(message.chat.id, reply);
});

async function mockLLMCall(prompt: string): Promise<string> {
  return `AI Assistant received: "${prompt}"`;
}

await bot.start();
```

*For a full conversational AI flow with token tracking and OpenTelemetry spans, see the [`examples/ai-bot-starter`](./examples/ai-bot-starter).*

---

## 🛡️ Production Rate Limiting

> [!WARNING]
> The default `TokenBucketRateLimiter` included in the core package operates **in-memory**. It is designed solely for local development and single-instance applications.
>
> In multi-instance, scaled, or serverless deployments (where multiple handler instances spin up), **you must use the distributed rate limiter** via the Redis adapter:

```typescript
import { RedisKvStore, createRateLimiter } from '@jilimb0/tgwrapper-adapter-redis';

const kv = new RedisKvStore({
  redisUrl: process.env.REDIS_URL!,
  prefix: 'mybot'
});

const limiter = createRateLimiter(kv, {
  namespace: 'spam-protection',
  windowMs: 60_000,
  limit: 20,
  blockDurationMs: 30_000 // Block for 30s if exceeded
});

const state = await limiter.check('user:12345');
if (!state.allowed) {
  console.log(`Rate limited! Retry in ${state.retryAfter} seconds.`);
}
```

---

## 📊 Compatibility & Stability Matrix

| Environment Element | Supported Versions / Targets | Notes |
| :--- | :--- | :--- |
| **Node.js Runtime** | `>= 18.0.0` | Relies on standard fetch and AsyncLocalStorage. |
| **Telegram Bot API** | `9.4` | Enforced by type-drift checking validation. |
| **Redis Server** | `>= 6.2.0` | Required for Redis Adapter (eval scripts support). |
| **Edge Runtimes** | Cloudflare Workers, AWS Lambda | Fully compatible due to fetch-first transport. |

---

## 🔒 Trust Layer & Release Quality Gates

We enforce high production standards through the following CI gates on every commit:
- **Type-drift baseline check:** Automated comparison against the upstream Telegram API schema.
- **Size budgeting:** Enforcing bundle-size constraints to ensure lightweight serverless cold starts.
- **Changesets Integration:** All package versions are tracked via GitHub actions to guarantee provenance.

Run validations locally:
```bash
pnpm install
pnpm build
pnpm test
pnpm verify:release
```

---

## 📑 Core Documentation Index

- [Why TGWrapper?](./docs/WHY_TGWRAPPER.md) - Deep dive on value proposition.
- [Comparison Matrix](./docs/COMPARISON.md) - TGWrapper vs. grammY vs. Telegraf.
- [Development Guide](./docs/BOT_DEVELOPMENT_GUIDE.md) - Bot architecture, middleware, routing.
- [Production Checklist](./docs/PRODUCTION_CHECKLIST.md) - Ensure reliability before launching.
- [Observability Guide](./docs/OBSERVABILITY_CONTRACT.md) - Monitoring best practices.
- [Migration Guide from grammY](./docs/MIGRATION_FROM_GRMMY.md) - Smooth codebase porting.
- [Migration Guide from Telegraf](./docs/MIGRATION_FROM_TELEGRAF.md) - Switch guidelines.
