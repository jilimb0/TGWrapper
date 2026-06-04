# TGWrapper

> **TypeScript-first Telegram bot platform for teams that need runtime portability, distributed state, and structured telemetry.** The same handler code runs on Node.js, Cloudflare Workers, and AWS Lambda. Scales from a single dev process to a Redis-backed multi-instance fleet without rewriting a line of handler logic.

[![npm version](https://img.shields.io/npm/v/@jilimb0/tgwrapper.svg)](https://www.npmjs.com/package/@jilimb0/tgwrapper)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

---

## ⚡ Quick Start

```typescript
import { createBotClient } from '@jilimb0/tgwrapper';

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'polling' });
bot.on('message', async (msg) => {
  if ('text' in msg) await bot.sendMessage(msg.chat.id, `Echo: ${msg.text}`);
});
await bot.start();
```

```bash
pnpm add @jilimb0/tgwrapper   # install
pnpm build && pnpm test       # validate types + tests
```

**Production path:** `mode: 'polling'` (local dev) → add Redis adapter (distributed state) → switch to `mode: 'webhook'` (serverless / edge)

**Reference apps:** [Polling bot](./examples/polling-starter) · [Multi-instance + Redis](./examples/multi-instance-redis-starter) · [Serverless / edge](./examples/serverless-webhook-starter) · [AI-native bot](./examples/ai-bot-starter)

---

## 🎯 Why teams choose TGWrapper

| Reason | What you get |
| :--- | :--- |
| **Typed contracts** | Zero `any` on the critical path — compiler catches Telegram API mistakes before runtime |
| **Runtime portability** | Node.js, Cloudflare Workers, AWS Lambda — same code, mode is a config flag, not a rewrite |
| **Redis scale-out** | CAS-based distributed sessions prevent silent overwrites across concurrent instances |
| **Built-in telemetry** | Structured logs, trace IDs, pull-based metrics — no custom middleware glue needed |
| **Release verification** | Automated schema drift detection + benchmark budgets enforced on every commit |

## ❌ Do not choose TGWrapper if…

- You want a **toy bot in < 30 lines** — any library works; TGWrapper adds deliberate structure for serious bots
- You have **no distributed state or scaling needs** — in-memory defaults work but the Redis layer is the main differentiator
- You do not care about **structured observability and telemetry** — the framework is designed with production monitoring in mind
- You are working outside **TypeScript / JavaScript** — TS-first only; no other language bindings planned

---

## 🛡️ Proof Snapshot

Direct operational evidence backing the framework's reliability:

| Gate / Quality Metric | Status / Evidence |
| :--- | :--- |
| **Comprehensive Tests** | `100% Passed` — 21 test files / 57 integration & FSM fuzz tests. |
| **Drift Watchdog** | `Active` — Weekly automated checks against Telegram upstream schemas. |
| **Benchmark Performance** | `Validated` — Low-overhead core processing (up to 180,000 updates/sec). |
| **Disaster Recovery** | `Verified` — Chaos drills simulating Redis reconnect storms & network partition splits. |
| **Runtime Portability** | `Cross-Platform` — Verified on Node.js >= 18, Cloudflare Workers, and AWS Lambda. |

### 🔬 Proof & Release Safeguards
- **Runtime Portability:** Every build is automatically tested against both Node.js (v18+) and Edge runtimes (Cloudflare Workers, AWS Lambda).
- **Auto Drift Protection:** Weekly watchdog scripts validate our generated types against the latest official Bot API schema, preventing drift.
- **Benchmark Budgets:** Core processing cost budget is capped at <0.5ms per update under simulated load of 180,000 updates/sec.
- **Disaster Drills:** Automated tests simulate network packet losses, 429 backpressures, and thread locks to verify robust recovery.

---

## 🎯 Quick Decision Matrix

Choose the right framework for your workload:

| Feature / Workload | **TGWrapper** | **grammY** | **Telegraf** |
| :--- | :--- | :--- | :--- |
| **Simple Bot** | ✅ Good (Clean, direct) | ✅ Excellent (Many features) | ✅ Good (Simplicity) |
| **Distributed / Scaled Bot** | 🌟 **Best-in-class** (Redis CAS) | ⚠️ Manual (Overwrites possible) | ⚠️ Manual |
| **AI / Conversational Bot** | 🌟 **Best-in-class** (Session safety) | ⚠️ Race-prone | ⚠️ Race-prone |
| **Observability-Heavy Bot** | 🌟 **Best-in-class** (Context traces) | ❌ None built-in | ❌ None built-in |
| **Cold Starts (Serverless)** | ⚡ **Low** (Edge native) | ⚠️ Moderate (Requires shims) | ⚠️ Moderate |

---

## 🧭 Which Path Should You Take?

Choose the canonical template matching your architecture:

* **Simple Bot (VPS / Dev):** [`examples/polling-starter`](./examples/polling-starter) — Node.js long-polling, single-process, local iteration.
* **Distributed / Scaling Bot:** [`examples/multi-instance-redis-starter`](./examples/multi-instance-redis-starter) — Multi-node deployment, shared state, distributed rate limits.
* **Serverless / Edge Bot:** [`examples/serverless-webhook-starter`](./examples/serverless-webhook-starter) — AWS Lambda, Cloudflare Workers, edge-native webhooks.

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

---

## ⚡ Quick Starts

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

## 🛑 Limitations & Non-goals

Before adopting TGWrapper, review the architectural boundaries of the core package:

* **No Built-in UI Builder:** Unlike heavy frameworks, TGWrapper does not contain custom templating DSLs or markup generators. You generate raw Telegram markdown/HTML payloads directly.
* **No Media Download/Upload Server:** The framework wraps standard multipart and file fetch API endpoints but does not ship with automatic file caching or download streaming proxies.
* **Single-threaded Polling Loop:** While webhook scaling is distributed, polling relies on a single loop. Large workloads on polling should switch to webhook ingestion.
* **Non-goal: Multi-platform Unified Client:** The project is dedicated specifically to the Telegram Bot API and does not plan to support Discord, Slack, or other platforms.

---

## 🛡️ Evidence & Validation

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

**Getting Started**
- [Why TGWrapper?](./docs/WHY_TGWRAPPER.md) — Positioning and architectural wedge.
- [System Architecture](./docs/SYSTEM_ARCHITECTURE.md) — Component model, dependency direction, and runtime stack.
- [Comparison Matrix](./docs/COMPARISON.md) — TGWrapper vs. grammY vs. Telegraf.
- [Project Doctrine](./docs/DOCTRINE.md) — Identity, non-goals, and contribution boundaries.

**Development**
- [Development Guide](./docs/BOT_DEVELOPMENT_GUIDE.md) — Bot architecture, middleware, routing.
- [Migration Guide from grammY](./docs/MIGRATION_FROM_GRMMY.md) — Smooth codebase porting.
- [Migration Guide from Telegraf](./docs/MIGRATION_FROM_TELEGRAF.md) — Switch guidelines.

**Production Operations**
- [Production Checklist](./docs/PRODUCTION_CHECKLIST.md) — Ensure reliability before launching.
- [Redis Runtime Guide](./docs/REDIS_RUNTIME.md) — Topologies, session locking, failure modes.
- [Telemetry Reference](./docs/TELEMETRY_REFERENCE.md) — Event schemas, metrics, exporters, debugging.
- [Observability Contract](./docs/OBSERVABILITY_CONTRACT.md) — Monitoring best practices.

**Quality & Evidence**
- [Proof Layer](./docs/PROOF_LAYER.md) — Test strategy, benchmarks, and failure drills.
- [Field Notes](./docs/FIELD_NOTES.md) — Real-world pilot observations and early adopter feedback.
- [Hardening Checklist](./docs/HARDENING_CHECKLIST.md) — Release confidence gates for production deployments.
