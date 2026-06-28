# TGWrapper

> Production Telegram bots in TypeScript — with Redis state, observability, and reliability semantics built in.
>
> When your bot stops being a side project and becomes a core service, TGWrapper is where teams land.

[![npm version](https://img.shields.io/npm/v/@tgwrapper/core.svg)](https://www.npmjs.com/package/@tgwrapper/core)
[![CI](https://github.com/jilimb0/TGWrapper/actions/workflows/ci.yml/badge.svg)](https://github.com/jilimb0/TGWrapper/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

---

## ⚡ Quick Start

Requirements

- Node.js `>=22.13`
- `pnpm` (workspace-aware package manager)
- Redis when you need distributed state or multi-instance coordination

```typescript
import { createBotClient } from "@tgwrapper/core"

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: "polling" })
bot.on("message", async (msg) => {
  if ("text" in msg) await bot.sendMessage(msg.chat.id, `Echo: ${msg.text}`)
})
await bot.start()
```

```bash
pnpm add @tgwrapper/core   # install
pnpm build && pnpm test       # validate types + tests
```

**Reference apps:** [Polling bot](./examples/polling-starter) · [Multi-instance + Redis](./examples/multi-instance-redis-starter) · [Serverless / edge](./examples/serverless-webhook-starter) · [AI-native bot](./examples/ai-bot-starter)

---

## 🧭 Choose Your Path

Whether you're starting a new bot or migrating an existing production workload, choose the path that fits you:

- **[Quick Start Guide](./docs/QUICK_START.md)** — Run your first bot in under 5 minutes (no Redis, no telemetry, zero config).
- **[Grow with TGWrapper](./docs/GROW_WITH_TGWRAPPER.md)** — Learn how to take a simple bot to production step-by-step.
- **[Tutorial Ladder](./docs/TUTORIALS.md)** — Structured step-by-step path from echo bots to AI-native applications.
- **Migration Guides** — Step-by-step transitions from [Telegraf](./docs/MIGRATION_FROM_TELEGRAF.md), [grammY](./docs/MIGRATION_FROM_GRMMY.md), or [python-telegram-bot](./docs/MIGRATION_FROM_PYTHON.md).

---

## 🎯 Who this is for

TGWrapper is built for **teams and senior engineers running serious Telegram bots** who have already felt the pain of their current stack:

- Duplicate sends from webhook retries because your handler didn't return in time
- Multi-instance state conflicts because there's no distributed session primitive
- Debugging a production incident with no trace IDs, no structured logs, no span context
- Self-rolled rate limiting that's either too loose or causes unfair blocks under burst
- An AI-native bot that needs token metrics, tool-call tracing, and timeout contracts

If any of those sound familiar — this is where you land next.

## 🚫 Who this is NOT for (consciously)

- **First-time bot builders** — Telegraf and grammY are excellent starting points; TGWrapper adds structure that you don't need yet
- **Toy bots** — if you need 30 lines and a `/start` handler, any framework works fine
- **No Redis, no observability, no multi-instance needs** — in-memory session and polling work, but the framework's main value is in the distributed layer
- **Non-TypeScript stacks** — TS-first only

## ⚡ What gets easier with TGWrapper

- **No silent concurrent session overwrites:** Redis Compare-and-Swap (CAS) returns explicit conflicts instead of silently replacing newer state.
- **Trace incidents with structured context:** Correlation fields (`trace_id`, `span_id`) are attached to update processing, with strongest async propagation support in Node.js.
- **Fail gracefully under load:** Native distributed rate limiting (sliding-window via Redis ZSETs) and built-in timeout abort signals protect your API limits and prevent webhook retry loops.
- **Robust type safety:** Pure TypeScript contracts with typed handlers and typed session state instead of implicit `any` context magic.

---

## 🛡️ Proof Snapshot

Direct operational evidence backing the framework's reliability:

| Gate / Quality Metric     | Status / Evidence                                                                                                                                                                   |
| :------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Comprehensive Tests**   | `100% Passed` — 21 test files / 57 integration & FSM fuzz tests.                                                                                                                    |
| **Drift Watchdog**        | `Active` — Weekly automated checks against Telegram upstream schemas.                                                                                                               |
| **Benchmark Performance** | `Validated with caveats` — Synthetic core benchmark profiles have reached up to 180,000 updates/sec excluding Telegram API, Redis, user handlers, exporters, and network.           |
| **Disaster Recovery**     | `Verified` — Chaos drills simulating Redis reconnect storms & network partition splits.                                                                                             |
| **Runtime Portability**   | `Capability-specific` — Core webhook handling targets Node.js, Cloudflare Workers, and AWS Lambda; polling, Redis, observability exporters, and shutdown semantics vary by runtime. |

### 🔬 Proof & Release Safeguards

- **Runtime Portability:** Compatibility is tracked per capability in the [Compatibility Matrix](./docs/COMPATIBILITY_MATRIX.md).
- **Auto Drift Protection:** Weekly watchdog scripts validate our generated types against the latest official Bot API schema, preventing drift.
- **Benchmark Budgets:** Core processing budget is monitored with synthetic benchmark gates; see [Proof Map](./docs/PROOF_MAP.md) for reproduction scope.
- **Disaster Drills:** Automated tests simulate network packet losses, 429 backpressures, and thread locks to verify robust recovery.

### 👥 Early Adopters in Production

- **FinTech Notification Bot:** Switched from Telegraf to solve message duplicate issues. Runs 3 replicas on Kubernetes using webhook mode and Redis CAS sessions.
- **AI Coding Companion Bot:** Migrated from Python to track LLM token counts and trace latency per tool-call via `@tgwrapper/observability`.
- Read more detailed case studies in the [Field Notes](./docs/FIELD_NOTES.md).

---

## 🎯 Quick Decision Matrix

Choose the right framework for your workload:

| Feature / Workload           | **TGWrapper**                                                       | **grammY**                         | **Telegraf**                       |
| :--------------------------- | :------------------------------------------------------------------ | :--------------------------------- | :--------------------------------- |
| **Simple Bot**               | ✅ Good (Clean, direct)                                             | ✅ Excellent (Many features)       | ✅ Good (Simplicity)               |
| **Distributed / Scaled Bot** | ✅ Strong fit when Redis CAS and shared rate limits matter          | ⚠️ Possible with additional design | ⚠️ Possible with additional design |
| **AI / Conversational Bot**  | ✅ Strong fit when multi-turn state and token/latency traces matter | ⚠️ Add your own state safety       | ⚠️ Add your own state safety       |
| **Observability-Heavy Bot**  | ✅ Built-in hooks for structured logs, metrics, and traces          | ⚠️ External instrumentation        | ⚠️ External instrumentation        |
| **Serverless Webhooks**      | ✅ Core webhook path is designed for fetch-style runtimes           | ✅ Supported with runtime adapters | ⚠️ Usually Node-server oriented    |

---

## 🧭 Which Path Should You Take?

Choose the canonical template matching your architecture:

- **Simple Bot (VPS / Dev):** [`examples/polling-starter`](./examples/polling-starter) — Node.js long-polling, single-process, local iteration.
- **Distributed / Scaling Bot:** [`examples/multi-instance-redis-starter`](./examples/multi-instance-redis-starter) — Multi-node deployment, shared state, distributed rate limits.
- **Serverless / Edge Bot:** [`examples/serverless-webhook-starter`](./examples/serverless-webhook-starter) — AWS Lambda, Cloudflare Workers, edge-native webhooks.

---

## 📈 Maturity & Stability Matrix

| Package                                                              | Notes                                                                                                                                |
| :------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| [**`@tgwrapper/core`**](./README.md) (Core)                          | Stable API surface; see [docs/API_STABILITY.md](./docs/API_STABILITY.md) for the canonical stability policy.                         |
| [**`@tgwrapper/adapter-redis`**](./packages/adapter-redis/README.md) | Redis-backed coordination layer; see [docs/API_STABILITY.md](./docs/API_STABILITY.md) for stability definitions.                     |
| [**`@tgwrapper/observability`**](./packages/observability/README.md) | Telemetry layer with evolving trace schema; see [docs/API_STABILITY.md](./docs/API_STABILITY.md) for the canonical stability policy. |

For the platform-wide truth table, see [Platform Guarantees](./docs/PLATFORM_GUARANTEES.md), [Compatibility Matrix](./docs/COMPATIBILITY_MATRIX.md), and [Deployment Profiles](./docs/DEPLOYMENT_PROFILES.md).

---

## 🚀 The Golden Path Onboarding (10-15 Minutes)

Deploying a production-ready Telegram bot follows a single, non-branching workflow:

1. **Install Core & Initialize:** Install the core package.
2. **Develop with Polling:** Create your bot using polling mode for rapid local iteration.
3. **Add State & Caching (Redis):** Plug in the Redis adapter for multi-instance persistence.
4. **Attach Telemetry:** Plug in observability to trace errors and metrics.
5. **Switch to Webhook & Deploy:** Toggle mode to `webhook` and export to serverless runtimes.

Check out our comprehensive **[Grow with TGWrapper](./docs/GROW_WITH_TGWRAPPER.md)** guide to walk through this onboarding flow step-by-step.

---

## 🛡️ Distributed Rate Limiting

> [!WARNING]
> The default `TokenBucketRateLimiter` included in the core package operates **in-memory**. It is designed solely for local development and single-instance applications.
>
> In multi-instance or serverless deployments, **you must switch to the distributed rate limiter** via the Redis adapter:

```typescript
import { RedisKvStore, createRateLimiter } from "@tgwrapper/adapter-redis"

const kv = new RedisKvStore({
  redisUrl: process.env.REDIS_URL!,
  prefix: "mybot",
})
const limiter = createRateLimiter(kv, {
  namespace: "spam-protection",
  windowMs: 60_000,
  limit: 20,
  blockDurationMs: 30_000,
})
```

---

## 🛑 Limitations & Non-goals

Before adopting TGWrapper, review the architectural boundaries of the core package:

- **No Built-in UI Builder:** Unlike heavy frameworks, TGWrapper does not contain custom templating DSLs or markup generators. You generate raw Telegram markdown/HTML payloads directly.
- **No Media Download/Upload Server:** The framework wraps standard multipart and file fetch API endpoints but does not ship with automatic file caching or download streaming proxies.
- **Single-threaded Polling Loop:** While webhook scaling is distributed, polling relies on a single loop. Large workloads on polling should switch to webhook ingestion.
- **Non-goal: Multi-platform Unified Client:** The project is dedicated specifically to the Telegram Bot API and does not plan to support Discord, Slack, or other platforms.

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

- [Quick Start](./docs/QUICK_START.md) — Run your first bot in under 5 minutes.
- [Grow with TGWrapper](./docs/GROW_WITH_TGWRAPPER.md) — Complete maturity path from dev to production.
- [Tutorials](./docs/TUTORIALS.md) — Structured step-by-step walkthroughs.
- [Why TGWrapper?](./docs/WHY_TGWRAPPER.md) — Positioning and architectural wedge.
- [Why not Telegraf?](./docs/WHEN_TELEGRAF_STOPS.md) — When Telegraf stops being enough.
- [grammY vs TGWrapper](./docs/GRAMMY_VS_TGWRAPPER.md) — Honest comparison for long-lived bots.
- [Telegraf vs TGWrapper](./docs/TELEGRAF_VS_TGWRAPPER.md) — Familiar middleware vs production contracts.
- [Migrate from python-telegram-bot](./docs/MIGRATION_FROM_PYTHON.md) — Python to TypeScript path.
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

- [Claims Audit](./docs/CLAIMS_AUDIT.md) — Public claim status, evidence level, and required wording.
- [Proof Map](./docs/PROOF_MAP.md) — Claim-to-test/workflow/source mapping.
- [Compatibility Matrix](./docs/COMPATIBILITY_MATRIX.md) — Capability support by runtime.
- [Platform Guarantees](./docs/PLATFORM_GUARANTEES.md) — Unified guarantees and non-guarantees.
- [Deployment Profiles](./docs/DEPLOYMENT_PROFILES.md) — Blessed runtime shapes and caveats.
- [Demo Flows](./docs/DEMO_FLOWS.md) — Canonical production-safe, Redis-backed, and AI observability demos.
- [Proof Layer](./docs/PROOF_LAYER.md) — Test strategy, benchmarks, and failure drills.
- [Field Notes](./docs/FIELD_NOTES.md) — Real-world pilot observations and early adopter feedback.
- [Hardening Checklist](./docs/HARDENING_CHECKLIST.md) — Release confidence gates for production deployments.
