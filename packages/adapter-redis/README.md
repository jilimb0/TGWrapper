# @tgwrapper/adapter-redis

> **Distributed state, caching and rate limiting layer for TGWrapper production deployments.**
>
> Redis-backed session adapter and sliding-window rate limiter for multi-instance deployments. It upgrades compatible in-process session/rate-limit integration points to shared Redis primitives with explicit conflict handling.

```bash
pnpm add @tgwrapper/adapter-redis ioredis
```

---

## 🎯 When you need this / When you do not

For the migration threshold from in-memory state to Redis, see [When To Add Redis](../../docs/WHEN_TO_ADD_REDIS.md).

**Use this when:**

- Running **2+ bot instances** sharing the same bot token
- User state must **survive process restarts**
- Need **distributed rate limiting** shared across all instances
- Need **atomic session writes** with no silent overwrites under concurrent load

**Skip this if:**

- Single-process bot with no horizontal scaling plans — in-memory defaults are sufficient
- Serverless without persistent Redis — connection establishment overhead degrades cold starts
- Prototyping or testing — use the default in-memory session adapter

---

## 🔑 What it solves

| Problem                         | Mechanism                                                                                                                  |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------- |
| Concurrent session overwrites   | CAS (Compare-and-Swap) via atomic Lua script — returns `ok: false` on conflict instead of silently overwriting newer state |
| Shared rate limits across nodes | Sliding-window sorted-set counter evaluated atomically per Lua script — one counter, all instances                         |
| State lost on process restart   | Redis key-value persistence with configurable TTL per session                                                              |
| Cross-dataset key clashes       | All keys namespaced by configured prefix + environment — no accidental overlap                                             |

---

## 📦 Installation

```bash
pnpm add @tgwrapper/adapter-redis ioredis
```

---

## 📈 Maturity & Support Level

- **Package Stability:** `Early Production` — see [docs/API_STABILITY.md](../../docs/API_STABILITY.md) for the canonical stability policy.
- **Adoption Status:** Validated in multi-instance simulation tests.
- **Runtime Support:** Node.js `>=22.13` (requires Redis Server `>= 6.2.0`).
- **API Stability:** See [docs/API_STABILITY.md](../../docs/API_STABILITY.md) for the canonical API stability definitions. The adapter surface is currently staging and is intended to remain backwards-compatible across patch/minor releases.

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
import { RedisSessionAdapter } from "@tgwrapper/adapter-redis"

const sessionAdapter = new RedisSessionAdapter({
  redisUrl: process.env.REDIS_URL!,
  tenantId: "tenant_abc",
  botId: "production_bot",
  ttlSeconds: 86400, // Expire sessions after 24h
})
```

### 2. Distributed Rate Limiter (`RedisRateLimiter`)

Protects your bot from load spikes. Uses an atomic Lua script to evaluate limits.

```typescript
import { RedisKvStore, createRateLimiter } from "@tgwrapper/adapter-redis"

const kv = new RedisKvStore({ redisUrl: process.env.REDIS_URL! })
const limiter = createRateLimiter(kv, {
  namespace: "chat_limit",
  windowMs: 10_000,
  limit: 5,
  blockDurationMs: 60_000, // Block for 1 min if exceeded
})
```

---

## 🏗️ Supported Topologies & Environment Matrix

| Topology Mode                             | Support Level     | Implementation Notes                                                                                                                            |
| :---------------------------------------- | :---------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Standalone Redis**                      | `Full`            | Supported out of the box with standard TCP connections.                                                                                         |
| **Managed Redis (AWS ElastiCache, etc.)** | `Full`            | Supported. Recommended to enable `keepAlive` in `ioredis` configuration options.                                                                |
| **Redis Sentinel**                        | `Full`            | Supported by passing a pre-configured `ioredis` Sentinel client via client injection.                                                           |
| **Redis Cluster**                         | `Limited`         | Supported with limitations. Lua scripts require all session / rate-limit keys to reside on the same slot (use `{hash-tags}`).                   |
| **Read Replicas**                         | `Not Recommended` | The adapter performs write operations (session updates, rate limits) on almost all calls. Direct replication lag can cause stale session reads. |
| **Serverless Ephemeral Redis**            | `Not Recommended` | Connection establishment overhead on every lambda invocation degrades execution performance.                                                    |

---

## 🛡️ Guarantees and Non-Guarantees

### What is Guaranteed:

- **Session Atomicity via CAS:** The session adapter performs Compare-and-Swap (CAS) writes using an atomic Lua script. Concurrent updates for the same user/chat do not silently overwrite each other. If a collision occurs, the adapter returns `ok: false`, allowing developers to handle conflicts explicitly.
- **Sliding Window Accuracy:** The distributed rate limiter uses a sorted-set sliding window algorithm implemented via a Lua script. Rate checks and increment operations are strictly atomic.
- **Namespace Isolation:** All written keys are securely namespaced using the configured prefix to prevent clashes with other datasets.

### Non-Guarantees & Trade-offs:

- **Pessimistic Locking:** The adapter uses optimistic locking (CAS). It does **not** lock session keys pessimistically. Extremely high-concurrency hotspots will experience CAS failures (`ok: false`) and will require an application-level backoff-retry loop.
- **Hard Dependency on Redis Uptime:** If Redis becomes unavailable, session reads and rate-limiting checks will fail. There is no automated in-memory fallback to avoid split-brain state scenarios across distributed instances.

---

## ⏱️ Rate Limiter Semantics & Boundary Behaviors

The distributed rate limiter enforces request quotas using an atomic sorted-set sliding window model.

### Core Mechanics

- **Algorithm:** Sorted Set (ZSET) Sliding Window. Every checked request pushes a unique string member `timestamp:randomId` scored by the epoch timestamp `Date.now()`.
- **Atomic Cleanup:** The Lua check script executes `ZREMRANGEBYSCORE` to evict logs older than the current window limit (`now - windowMs`) before checking the cardinality (`ZCARD`).
- **Temporary Block Option:** If `blockDurationMs` is configured, a temporary block key is written in Redis when the rate is breached, causing instant rejections without running ZSET updates.

### Boundary Anomalies & Caveats

- **Clock Synchronization:** Because evaluation scores rely on JS timestamps (`Date.now()`), **wide clock variations (>100ms) between multiple bot servers** will cause uneven rate limit enforcement. Synchronize all servers using NTP/Chrony.
- **Fairness:** Rejection is immediate and strict. The limiter does **not** queue, buffer, or schedule incoming messages; it rejects them immediately.
- **Memory Purging:** Sliding window keys configure TTL parameters (`windowMs + 1000`) so idle client records are eligible for cleanup. Actual eviction behavior still depends on Redis memory policy and availability.

---

## 📊 What to Monitor (Operational Metrics)

When running the Redis adapter in critical production deployments, ensure your telemetry dashboard tracks:

1. **Redis Cmd Latency:** Slow command execution (> 5ms) on `EVALSHA` / `EVAL` directly degrades update ingestion loops.
2. **CAS Conflict Rate:** Track the proportion of `session.conflict` events. A rising count signals concurrent state update clashes.
3. **Limiter Rejects (`ratelimit.blocked`):** Monitor spikes in rate limiter rejections to detect flood/spam attacks or adjust user quotas.
4. **Reconnect Count:** High frequency of connection drops indicating network partition issues or resource limits on the Redis instance.
5. **Key Churn & Memory Limit:** Verify key evictions. Ensure Redis `maxmemory-policy` is set to `volatile-lru` or `allkeys-lru` to handle session TTL purges.

---

## 🛑 Limitations & Non-goals

Before using the Redis adapter in your production architecture, review these constraints:

- **No Automatic Master/Replica Partitioning:** The adapter does not natively split read/write queries between master and replica nodes. If you run a large Redis Cluster, configure connection parameter objects on your custom `ioredis` instance and pass it via the `redis` injection parameter.
- **Lua Execution Overhead:** The rate limiter evaluates limits using Lua script commands. High rates of script execution on single Redis instances can load CPU; ensure your Redis memory policy is set to `volatile-lru` or `allkeys-lru` to auto-evict expired keys.
- **Client Injection Responsibility:** If you pass your own pre-instantiated `redis` client, lifecycle methods like `.disconnect()` will close the connection. Manage the lifecycle of shared clients carefully.
- **Non-goal: Relational Session Queries:** The session adapter is key-value based; scanning or querying sessions by inner fields (like filtering active users) is out of scope.

---

## 🛡️ Evidence & Validation

We enforce continuous verification on the Redis adapter:

- **Integration Test Coverage:** Validated against real Redis instances using the `pnpm test:integration` command. Covers connection pooling, client injection lifecycle, CAS version updates, and Lua-based rate limiting.
- **Concurrency Test Verification:** Concurrency conflicts are automatically tested via fuzzing checks inside `test/chaos` to ensure the integrity of the CAS state machine.

### 🔬 Proof & Operations Validation

- **Topology Support:** Designed for standalone Redis, managed Redis, Sentinel client injection, and hash-tagged Redis Cluster deployments. Review [Redis Topologies](../../docs/REDIS_TOPOLOGIES.md) for caveats.
- **Behavior Under Contention:** Fuzz tests run 100+ concurrent writes to a single session to verify zero silent overwrites, ensuring CAS consistency.
- **Limiter Robustness:** Sliding-window rate limiters tested with high-frequency concurrent script calls to guarantee accurate token count under load.
- **Caveats Audited:** Monitored against standard memory limits with eviction policies to prevent OOM issues.
