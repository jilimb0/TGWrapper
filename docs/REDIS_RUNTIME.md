# Redis Runtime Guide

> Package: `@tgwrapper/adapter-redis` · Stability: Early Production · Runtime: Node.js `>=22.13` · Redis requirement: ≥ 6.2
>
> See [docs/API_STABILITY.md](./API_STABILITY.md) for the canonical stability policy.

This document is the authoritative operational reference for running TGWrapper's Redis adapter in production. It covers supported topologies, session guarantee semantics, rate limiter internals, failure modes, and monitoring.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Supported Redis Topologies](#2-supported-redis-topologies)
3. [Session Adapter — Guarantees & Semantics](#3-session-adapter--guarantees--semantics)
4. [Rate Limiter — Algorithm & Guarantees](#4-rate-limiter--algorithm--guarantees)
5. [Key Naming & Prefix Policy](#5-key-naming--prefix-policy)
6. [Connection Configuration](#6-connection-configuration)
7. [Failure Modes & Resilience](#7-failure-modes--resilience)
8. [Redis Metrics to Monitor](#8-redis-metrics-to-monitor)
9. [Known Limitations](#9-known-limitations)

---

## 1. Overview

The Redis adapter provides two runtime capabilities:

| Capability                    | Class / Function                   | Purpose                                                   |
| ----------------------------- | ---------------------------------- | --------------------------------------------------------- |
| **Versioned session storage** | `RedisSessionAdapter`              | Persist user/chat state across bot instances and restarts |
| **Distributed rate limiting** | `createRateLimiter(store, config)` | Enforce per-user request quotas across all bot nodes      |

Both rely on `RedisKvStore` as the underlying key-value abstraction, which wraps `ioredis`.

**Minimum viable setup:**

```typescript
import {
  RedisKvStore,
  createRateLimiter,
  RedisSessionAdapter,
} from "@tgwrapper/adapter-redis"

const store = new RedisKvStore({
  redisUrl: process.env.REDIS_URL!,
  prefix: "mybot",
})
const limiter = createRateLimiter(store, {
  namespace: "limits",
  windowMs: 60_000,
  limit: 20,
})
const sessions = new RedisSessionAdapter({
  redisUrl: process.env.REDIS_URL!,
  tenantId: "acme",
  botId: "mybot",
  ttlSeconds: 86400,
})
```

---

## 2. Supported Redis Topologies

### 2.1 Single Node (Development / Low-Traffic Production)

```
Bot Instance(s) ──► Redis (standalone)
```

**Requirements:** Redis ≥ 6.2, any cloud provider or self-hosted.

```env
REDIS_URL="redis://localhost:6379"
```

**Suitable for:** Development, staging, and production bots with < ~5,000 active sessions and < ~500 updates/min.

---

### 2.2 Redis with TLS (Standard Production)

```
Bot Instance(s) ──(TLS)──► Redis (standalone, TLS-enabled)
```

```env
REDIS_URL="rediss://redis.example.com:6380"
```

The `rediss://` scheme activates TLS in `ioredis`. No additional config needed in the adapter.

---

### 2.3 Redis Sentinel (High-Availability Production)

```
                    ┌─ Sentinel 1
Bot Instance(s) ────┤─ Sentinel 2    ──► Master Redis ──► Replica(s)
                    └─ Sentinel 3
```

Pass a custom `ioredis` instance to the adapter:

```typescript
import Redis from "ioredis"
import { RedisKvStore } from "@tgwrapper/adapter-redis"

const redis = new Redis({
  sentinels: [
    { host: "s1.example.com", port: 26379 },
    { host: "s2.example.com", port: 26379 },
  ],
  name: "mymaster",
  password: process.env.REDIS_PASSWORD,
})

const store = new RedisKvStore({ redis, prefix: "mybot" })
```

**Suitable for:** Production bots requiring automatic failover with < 30 s recovery time.

---

### 2.4 Redis Cluster (Very High Traffic)

> **Not yet validated.** Redis Cluster support is planned but has not been benchmarked with TGWrapper's Lua scripts. Lua scripts must execute on the same slot (same hash tag in key names). Contributions and test reports are welcome.

---

## 3. Session Adapter — Guarantees & Semantics

### 3.1 Storage Model

Each session is stored as a JSON-serialized string under:

```
{prefix}:session:{tenantId}:{botId}:{sessionKey}
```

Sessions include an integer `version` field. The adapter never overwrites a key without checking the version first.

### 3.2 compareAndSet (CAS) Semantics

`compareAndSet(key, expectedVersion, newValue)` executes atomically via a Lua script:

```lua
local current = redis.call('GET', KEYS[1])
if current == false then
  -- Key does not exist: treat as version 0
  if ARGV[1] == '0' then
    redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
    return 1
  end
  return 0
end
local decoded = cjson.decode(current)
if decoded.version == tonumber(ARGV[1]) then
  redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
  return 1
end
return 0
```

- Returns `{ ok: true }` if the write succeeded.
- Returns `{ ok: false }` if the version did not match (a concurrent write happened first).
- **Callers are responsible for retrying** on `{ ok: false }`. A typical pattern is: re-read the session, re-apply the mutation, then CAS again.

### 3.3 TTL Behaviour

- TTL is reset on every successful `set` or `compareAndSet` write.
- TTL is **not** extended on read-only `get` calls.
- Sessions that expire are silently deleted by Redis. The next `get` returns `null`.

### 3.4 Consistency Guarantee

| Scenario                                           | Behaviour                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| Two instances write to the same key simultaneously | One succeeds (higher version wins CAS), the other gets `ok: false` |
| Redis restarts mid-write                           | Write is lost; the next read returns the last committed state      |
| Session key expires during a handler               | `get` returns `null`; treat as a fresh session                     |

---

## 4. Rate Limiter — Algorithm & Guarantees

### 4.1 Algorithm: Sliding Window with Lua Atomicity

The rate limiter uses a **sliding window counter** implemented entirely in a single Lua script executed atomically on Redis:

1. Remove entries older than `now - windowMs` from a sorted set.
2. Count remaining entries.
3. If count ≥ `limit`, block. Compute `retryAfterMs` from the oldest entry's expiry.
4. Otherwise, add the current timestamp to the sorted set and set its TTL.

All four steps are atomic. No TOCTOU race is possible.

### 4.2 Configuration Reference

```typescript
interface RateLimiterConfig {
  namespace: string // Key namespace prefix; isolate different limiters
  windowMs: number // Rolling window duration in milliseconds
  limit: number // Max allowed requests per window per key
  blockDurationMs: number // (optional) Extra penalty block after hitting the limit
}
```

### 4.3 Return Value

```typescript
interface RateLimitResult {
  allowed: boolean // Whether the request is permitted
  remaining: number // Requests remaining in the current window
  retryAfter: number // Seconds until the key is unblocked (0 if allowed)
  resetAt: number // Unix timestamp (ms) when the window resets
}
```

### 4.4 Key Naming

Rate limiter keys follow:

```
{prefix}:ratelimit:{namespace}:{key}
```

Example: `mybot:ratelimit:chat_limits:user:12345678`

---

## 5. Key Naming & Prefix Policy

All keys written by the adapter are namespaced under the `prefix` you provide to `RedisKvStore`. This ensures zero collision with other applications sharing the same Redis instance.

| Data type         | Key pattern                                        |
| ----------------- | -------------------------------------------------- |
| Session           | `{prefix}:session:{tenantId}:{botId}:{sessionKey}` |
| Rate limit window | `{prefix}:ratelimit:{namespace}:{key}`             |

**Recommendation:** Use a prefix unique to your bot and environment, e.g. `mybot:prod` vs `mybot:staging`.

---

## 6. Connection Configuration

The adapter accepts either a `redisUrl` string or a pre-constructed `ioredis` instance. Prefer passing your own instance for advanced configuration:

```typescript
import Redis from "ioredis"

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
  tls: process.env.REDIS_TLS === "true" ? {} : undefined,
  reconnectOnError: (err) => err.message.includes("READONLY"),
})

redis.on("error", (err) => console.error("[redis] connection error:", err))
redis.on("reconnecting", () => console.warn("[redis] reconnecting..."))

const store = new RedisKvStore({ redis, prefix: "mybot:prod" })
```

---

## 7. Failure Modes & Resilience

### 7.1 Redis Unavailable on Startup

`ioredis` will retry the connection according to its backoff policy. The bot process will start, but the first session or rate limit operation will block until Redis is reachable.

**Mitigation:** Set a connection timeout and implement a startup health check before accepting updates.

### 7.2 Redis Disconnects Mid-Operation

`ioredis` queues pending commands and replays them after reconnection. Short disconnects (< 30 s) are typically transparent to the application.

**Mitigation:** Configure `maxRetriesPerRequest` and handle `ReplyError` in your handlers.

### 7.3 CAS Conflict Storm

Under very high concurrency on a single session key, CAS conflicts will cascade. Each conflict requires a re-read + re-write cycle, which adds latency.

**Mitigation:** Implement bounded retry with exponential backoff:

```typescript
async function writeSessionWithRetry(adapter, key, mutation, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const session = (await adapter.get(key)) ?? { version: 0 }
    const next = mutation(session)
    const result = await adapter.compareAndSet(key, session.version, next)
    if (result.ok) return true
    await new Promise((r) => setTimeout(r, 20 * 2 ** attempt)) // 20ms, 40ms, 80ms
  }
  return false // Give up after maxRetries
}
```

### 7.4 Redis Memory Full (`maxmemory` reached)

Redis will evict keys according to its `maxmemory-policy`. If set to `allkeys-lru`, old sessions may be silently deleted.

**Mitigation:** Monitor `used_memory` / `maxmemory` ratio. Set alerts at 80% utilization. Consider a dedicated Redis instance for bot sessions.

### 7.5 Lua Script Eviction

Redis can evict cached Lua scripts under memory pressure. `ioredis` will re-register the script on the next call automatically.

---

## 8. Redis Metrics to Monitor

Monitor these `redis-cli INFO` fields in production:

| Redis Metric                        | Alert Threshold              | What It Means                                  |
| ----------------------------------- | ---------------------------- | ---------------------------------------------- |
| `used_memory` / `maxmemory`         | > 80%                        | Session data growing; check TTLs               |
| `rejected_connections`              | > 0                          | Connection pool exhausted                      |
| `instantaneous_ops_per_sec`         | > 80% of throughput baseline | Redis CPU-bound                                |
| `keyspace_misses` / total cmds      | > 10%                        | High cache miss rate; check TTL config         |
| `blocked_clients`                   | > 0 (sustained)              | Commands waiting on BLPOP/similar; check usage |
| `evicted_keys`                      | > 0                          | `maxmemory` policy is evicting sessions        |
| `latency_ms` (from LATENCY HISTORY) | > 5 ms (p99)                 | Redis experiencing I/O contention              |

---

## 9. Known Limitations

- **Redis Cluster is not validated.** Lua scripts using multiple keys require all keys to share the same hash slot. The adapter does not currently enforce this. Use a single-node or Sentinel topology.
- **No read replicas.** All reads and writes target the primary. Read-heavy workloads cannot be offloaded to replicas without custom `ioredis` routing.
- **CAS is optimistic.** Conflicts are expected under high concurrency. Your application code must implement retry logic.
- **No automatic circuit breaker.** If Redis is unreachable, operations will hang until `ioredis` exhausts its retry budget. Implement your own circuit breaker if you require fast-fail behaviour.
- **Session schema evolution is your responsibility.** If you change the TypeScript type of your session, you must handle migration of existing serialized JSON in Redis manually.
- **No key enumeration.** The adapter does not provide a `list` or `scan` operation. You cannot enumerate all sessions from application code without direct Redis access.
