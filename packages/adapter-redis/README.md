# @jilimb0/tgwrapper-adapter-redis

> Redis storage adapter for TGWrapper, designed for production-oriented scaling, distributed FSM sessions, and sliding-window rate limiters.

## 📦 Installation

```bash
pnpm add @jilimb0/tgwrapper-adapter-redis ioredis
```

---

## 📈 Maturity & Support Level
- **Stability:** `Early Production`
- **Adoption Status:** Validated in multi-instance simulation tests.
- **Runtime Support:** Node.js (requires Redis Server `>= 6.2.0`).
- **API Stability:** `Staging` (API surface is stable; updates will preserve backwards compatibility).

---

## 🏗️ Architecture Layout

```
 [Telegram Updates] ──> [Bot Instance 1] ──┐
 [Telegram Updates] ──> [Bot Instance 2] ──┼──> [Shared Redis Cluster]
                                           │    (Distributed Sessions & Limits)
                                           └──> [Telemetry / Observability]
```

---

## 🛠️ Capabilities & API Overview

### 1. Versioned Sessions (`RedisSessionAdapter`)
Features optimistic concurrency control via Compare-and-Swap (CAS) to protect session data in concurrent multi-update scenarios.

```typescript
import { RedisSessionAdapter } from '@jilimb0/tgwrapper-adapter-redis';

const sessionAdapter = new RedisSessionAdapter({
  redisUrl: process.env.REDIS_URL!,
  tenantId: 'tenant_abc',
  botId: 'production_bot',
  ttlSeconds: 86400 // Expire sessions after 24h
});
```

### 2. Distributed Rate Limiter (`RedisRateLimiter`)
Protects your bot from load spikes. Uses an atomic Lua script to evaluate limits.

```typescript
import { RedisKvStore, createRateLimiter } from '@jilimb0/tgwrapper-adapter-redis';

const kv = new RedisKvStore({ redisUrl: process.env.REDIS_URL! });
const limiter = createRateLimiter(kv, {
  namespace: 'chat_limit',
  windowMs: 10_000,
  limit: 5,
  blockDurationMs: 60_000 // Block for 1 min if exceeded
});
```

---

## 🛑 Limitations & Caveats

Before using the Redis adapter in your production architecture, review these constraints:

* **No Automatic Master/Replica Partitioning:** The adapter does not natively split read/write queries between master and replica nodes. If you run a large Redis Cluster, configure connection parameter objects on your custom `ioredis` instance and pass it via the `redis` injection parameter.
* **Lua Execution Overhead:** The rate limiter evaluates limits using Lua script commands. High rates of script execution on single Redis instances can load CPU; ensure your Redis memory policy is set to `volatile-lru` or `allkeys-lru` to auto-evict expired keys.
* **Client Injection Responsibility:** If you pass your own pre-instantiated `redis` client, lifecycle methods like `.disconnect()` will close the connection. Manage the lifecycle of shared clients carefully.
