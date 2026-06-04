# TGWrapper — System Architecture

> One-page map of the component model, dependency direction, and runtime stack.

---

## 📐 Component Overview

TGWrapper is a layered monorepo. Each layer has a single, explicit responsibility and a hard dependency boundary — no package reaches upward or sideways.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Your Bot Application                        │
│             (examples/polling-starter, serverless-webhook,          │
│              multi-instance-redis-starter, ai-bot-starter)          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  imports
          ┌─────────────────────┼──────────────────────┐
          ▼                     ▼                        ▼
┌─────────────────┐  ┌──────────────────────┐  ┌────────────────────────┐
│  @jilimb0/      │  │  @jilimb0/tgwrapper  │  │  @jilimb0/tgwrapper   │
│  tgwrapper      │  │  -adapter-redis       │  │  -observability        │
│  (Core)         │  │  (Redis Layer)        │  │  (Telemetry Layer)     │
│                 │  │                       │  │                        │
│ • BotRuntime    │  │ • RedisSessionAdapter │  │ • MetricsRegistry      │
│ • FSM engine    │  │ • RedisRateLimiter    │  │ • Tracer + Spans       │
│ • Router        │  │ • RedisKvStore        │  │ • PrometheusExporter   │
│ • UpdatePipeline│  │ • Lua CAS scripts     │  │ • OTEL Bridge          │
│ • HTTP handlers │  │                       │  │ • AI/LLM trace hooks   │
│ • Type schemas  │  │ depends on: ioredis   │  │ depends on: core       │
└────────┬────────┘  └──────────┬────────────┘  └──────────┬─────────────┘
         │                      │                           │
         ▼                      ▼                           ▼
┌────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│ Telegram Bot   │   │ Redis Server ≥ 6.2   │   │ Telemetry Backend    │
│ API (upstream) │   │ (standalone/sentinel/ │   │ (stdout / Prometheus │
│                │   │  cluster/managed)     │   │  / OTEL Collector)   │
└────────────────┘   └──────────────────────┘   └──────────────────────┘
```

---

## 🏛️ Layer Responsibilities

### Core (`@jilimb0/tgwrapper`)

The only required package. Handles the full Telegram Bot API surface without external runtime dependencies.

| Subsystem | Responsibility |
| :--- | :--- |
| **BotRuntime** | Owns the update lifecycle: start, stop, graceful shutdown, error propagation. |
| **FSM Engine** | Provides a deterministic finite-state machine for multi-step conversation flows. State is pluggable (in-memory or Redis-backed). |
| **Router** | Pattern-matches incoming updates (messages, callbacks, inline queries) and dispatches to registered handlers. |
| **UpdatePipeline** | Ordered middleware chain applied to every incoming update before handlers run. |
| **Transport Adapters** | Polling loop and passive webhook ingestion share one `bot.ingest(update)` entrypoint — same handler code runs in both modes. |
| **Type Schemas** | Fully typed Telegram API request/response surfaces; checked against upstream schema snapshots on every commit. |

### Redis Layer (`@jilimb0/tgwrapper-adapter-redis`)

Optional. Plugs into the Core's session and rate-limiter interfaces. Has no dependency on the observability layer.

| Subsystem | Responsibility |
| :--- | :--- |
| **RedisSessionAdapter** | Implements the `SessionAdapter` interface. Writes session state using Lua CAS scripts to prevent cross-instance overwrites. |
| **RedisRateLimiter** | Implements the `RateLimiter` interface. Uses a sliding-window sorted-set counter atomically evaluated per Lua script. |
| **RedisKvStore** | Generic key-value store primitive used internally by both the session adapter and rate limiter. |

### Telemetry Layer (`@jilimb0/tgwrapper-observability`)

Optional. Wraps the Core's lifecycle hooks to capture structured telemetry without modifying handler code.

| Subsystem | Responsibility |
| :--- | :--- |
| **attachBotObservability()** | Single call that binds metric counters and log emitters to bot lifecycle events. |
| **MetricsRegistry** | In-process counter/histogram store. Exportable via Prometheus or OTLP. |
| **Tracer** | Wraps each update in an `AsyncLocalStorage` boundary, issuing a unique `traceId` propagated through all downstream calls. |
| **AI/LLM Hooks** | Span helpers for tracing token usage and latency of third-party LLM calls within the active update trace. |

---

## 🔗 Dependency Direction

```
Bot App
  └── Core               ← always required
        ├── Redis Layer  ← optional; depends on ioredis only
        └── Observability Layer  ← optional; depends on Core only
```

**Rules enforced at build time:**
- Redis Layer has **no dependency** on the Observability Layer.
- Observability Layer has **no dependency** on the Redis Layer.
- Neither plugin layer imports from user application code.
- Core has **zero runtime dependencies** (only `node:*` built-ins).

---

## ⚙️ Runtime Stack

| Layer | Technology | Notes |
| :--- | :--- | :--- |
| **Language** | TypeScript 5 (compiled to ESM + CJS dual) | Full type inference; no `any` in public API surface |
| **Runtime** | Node.js ≥ 18, Cloudflare Workers, AWS Lambda | Single codebase; mode switched via `createBotClient({ mode })` |
| **Session storage** | In-memory (default) or Redis ≥ 6.2 | Swappable via `SessionAdapter` interface |
| **Rate limiting** | In-memory (single-process) or Redis sliding window | Swappable via `RateLimiter` interface |
| **Tracing** | `AsyncLocalStorage` (Node) / global fallback (edge) | No instrumentation agent required |
| **Metrics export** | Prometheus text format or OTLP JSON | Pull (Prometheus scrape) or push (OTEL Collector) |
| **Build tooling** | pnpm workspaces + tsup + Vitest | Monorepo with per-package build isolation |
| **CI** | GitHub Actions (changeset, verify, release, redis-integration) | All gates must pass green before publish |

---

## 🔄 Update Lifecycle (end-to-end)

```
Telegram Bot API
      │
      │  getUpdates (polling) or POST /webhook (serverless)
      ▼
 BotRuntime.ingest(update)
      │
      ├─► [Middleware Pipeline]
      │         │
      │         ├─► Observability hook: emit update.received event + start trace span
      │         ├─► Rate Limiter check (in-memory or Redis sliding window)
      │         └─► Session load (in-memory or Redis CAS read)
      │
      ├─► Router dispatch → matching Handler(s)
      │         │
      │         └─► Handler logic (reads/writes session, calls bot API)
      │
      ├─► [Teardown]
      │         ├─► Session save (compareAndSet write if Redis-backed)
      │         └─► Observability hook: emit update.processed event + end trace span
      │
      └─► bot.sendMessage / bot.answerCallbackQuery (Telegram API call)
```

---

## 📦 Package Boundaries at a Glance

```
packages/
  ├── core/                  @jilimb0/tgwrapper
  ├── adapter-redis/         @jilimb0/tgwrapper-adapter-redis
  └── observability/         @jilimb0/tgwrapper-observability

examples/
  ├── polling-starter/       Minimal single-process bot (Node.js long-poll)
  ├── multi-instance-redis-starter/  Distributed bot (Redis sessions + rate limits + telemetry)
  ├── serverless-webhook-starter/    Edge/Lambda webhook ingestion
  ├── ai-bot-starter/        Stateful conversational AI bot (FSM + LLM tracing)
  ├── cloudflare-worker/     Cloudflare Workers deployment adapter
  └── aws-lambda/            AWS Lambda / API Gateway deployment adapter

docs/
  ├── SYSTEM_ARCHITECTURE.md     ← this file
  ├── REDIS_RUNTIME.md           Redis topology, locking, failure modes
  ├── TELEMETRY_REFERENCE.md     Event schemas, exporters, debugging
  ├── PRODUCTION_CHECKLIST.md    Pre-launch validation checklist
  ├── PROOF_LAYER.md             Test strategy, benchmarks, failure drills
  └── ...
```

---

## 🔗 Related Documents

- [Redis Runtime Guide](./REDIS_RUNTIME.md) — topology support matrix, CAS guarantees, failure modes
- [Telemetry Reference](./TELEMETRY_REFERENCE.md) — full event schema, metric names, exporter configs
- [Proof Layer](./PROOF_LAYER.md) — test strategy, benchmark profiles, chaos drill runbook
- [Production Checklist](./PRODUCTION_CHECKLIST.md) — pre-release gates and deployment validation
