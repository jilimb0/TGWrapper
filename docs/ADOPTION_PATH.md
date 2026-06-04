# Adoption Path Guide

This guide outlines the progressive integration model for TGWrapper — from a minimal local dev setup to a full distributed production deployment.

---

## 🗺️ Adoption Stages

```
  [Stage 1: Minimal]
        │  createBotClient + polling + basic handler
        ▼
  [Stage 2: Resilient]
        │  + Error handling + structured logging
        ▼
  [Stage 3: Observable]
        │  + attachBotObservability + MetricsRegistry
        ▼
  [Stage 4: Stateful]
        │  + RedisSessionAdapter (single instance)
        ▼
  [Stage 5: Distributed]
        │  + Multi-instance + RedisRateLimiter + webhook mode
        ▼
  [Stage 6: Production-Grade]
              Full telemetry stack, Prometheus, OTLP, hardening
```

---

## 1. Minimal Setup (< 10 minutes)

Everything starts as a polling bot with a simple message echo:

```bash
pnpm add @tgwrapper/core
```

```typescript
import { createBotClient } from '@tgwrapper/core';

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'polling' });
bot.on('message', async (msg) => {
  if ('text' in msg) await bot.sendMessage(msg.chat.id, `Echo: ${msg.text}`);
});
await bot.start();
```

**When this is enough:** Hobby bots, development experiments, single-user tools with no scaling needs.

**When to upgrade:** When you need user state between messages, or multiple instances, or production monitoring.

---

## 2. Adding Observability

When you want visibility into update latencies and errors, attach telemetry in one line:

```bash
pnpm add @tgwrapper/observability
```

```typescript
import { attachBotObservability, MetricsRegistry } from '@tgwrapper/observability';

const registry = new MetricsRegistry();
attachBotObservability(bot, {
  metrics: registry,
  logger: { log: (evt) => console.log(JSON.stringify(evt)) },
  serviceName: 'my-bot'
});
```

**Cost:** ~0.05ms per update. No external dependencies required.

---

## 3. Adding Persistent Sessions (Single Instance)

When users need state that survives process restarts:

```bash
pnpm add @tgwrapper/adapter-redis ioredis
```

```typescript
import { RedisSessionAdapter } from '@tgwrapper/adapter-redis';

const session = new RedisSessionAdapter({
  redisUrl: process.env.REDIS_URL!,
  tenantId: 'prod', botId: 'my-bot', ttlSeconds: 86400
});

const bot = createBotClient({
  token: process.env.BOT_TOKEN!,
  mode: 'polling',
  session: { store: session, initialState: () => ({ version: 1, step: 'idle' }) }
});
```

**When to upgrade to distributed:** When you need 2+ bot instances or horizontal scaling.

---

## 4. Distributed Scale (Multiple Instances)

Add distributed rate limiting and switch to webhook mode:

```typescript
import { RedisKvStore, createRateLimiter } from '@tgwrapper/adapter-redis';

const kv = new RedisKvStore({ redisUrl: process.env.REDIS_URL! });
const limiter = createRateLimiter(kv, {
  namespace: 'bot-limit', windowMs: 10_000, limit: 5, blockDurationMs: 30_000
});

// Switch transport
const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'webhook' });
```

See [`examples/multi-instance-redis-starter`](../examples/multi-instance-redis-starter) for a complete runnable reference.

---

## ❌ When TGWrapper May Be Too Much

- **Single hobby bot** that never scales beyond 1 instance — in-memory session + any framework works.
- **No observability requirements** — the opinionated telemetry layer adds minimal but real surface area.
- **Non-TypeScript stack** — TGWrapper is TS-first; other language ecosystems are out of scope.

---

## 📈 Complexity Growth Table

| Stage | Packages | Infrastructure | Complexity |
| :--- | :--- | :--- | :--- |
| Minimal | `tgwrapper` | None | ⭐ |
| Observable | `+ observability` | None | ⭐⭐ |
| Stateful (single) | `+ adapter-redis` | Redis (1 node) | ⭐⭐⭐ |
| Distributed | All packages | Redis cluster + webhook ingress | ⭐⭐⭐⭐ |
| Production-grade | All packages + monitoring | Redis + Prometheus/Grafana/OTLP | ⭐⭐⭐⭐⭐ |
