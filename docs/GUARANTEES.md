# Redis Layer: Guarantees & Non-Guarantees

This document defines the atomic execution semantics, consistency models, and operational boundaries of the `@jilimb0/tgwrapper-adapter-redis` package.

---

## 1. FSM Session Manager (`RedisSessionAdapter`)

The session adapter translates stateless HTTP requests into stateful, versioned sessions.

### ✅ What is Guaranteed
- **Optimistic Concurrency Control (OCC / CAS):** Session updates are committed using an atomic Lua script executing a Compare-and-Swap (CAS) sequence. If another process modified the session version while your handler was running, the update transaction will fail cleanly (`ok: false`) instead of silently overwriting user data.
- **TTL Persistence:** Every session configuration defines a `ttlSeconds` property. The time-to-live is renewed on every read or write call to ensure active user records are persisted.
- **Key-space Isolation:** Keys are strictly isolated using explicit namespaces (`prefix + tenantId + botId + sessionId`) to prevent overlap collision.

### ❌ What is NOT Guaranteed
- **Pessimistic Session Locking:** The adapter does **not** lock session keys during update evaluation. If you receive 10 rapid user taps, the first transaction will succeed, and the subsequent concurrent 9 will return CAS conflict errors. You must handle retry loops in the application layer.
- **In-Memory Local Fallback:** If the Redis instance becomes unreachable, the adapter throws an error immediately. It does **not** failover to local in-process memory, which would introduce divergent state partitions across horizontal nodes.

---

## 2. Distributed Rate Limiter (`RedisRateLimiter`)

The rate limiter enforces sliding-window tracking of user requests across multiple instances.

### ✅ What is Guaranteed
- **Atomic sliding-window counters:** Evaluated dynamically using sorted sets (ZSET) inside a single Lua call. It checks connection requests over the past window duration, registers the new request, and cleans expired elements atomically.
- **Temporary Jail / Block Duration:** If a client breaches the configured limit, the system places a block key in Redis for `blockDurationMs`. All requests during this block window are rejected instantly.

### ❌ What is NOT Guaranteed
- **Fair Queuing / Scheduling:** The rate limiter is a rejection tool. It drops requests exceeding the threshold; it does **not** queue, delay, or schedule requests for execution later.
- **Local Rate Cache Fallback:** If Redis is down, all rate limiter calls fail. Safe default rules (such as block-all or allow-all) must be explicitly managed by wrapping limiter evaluations in application code.
- **Clock Drift Safety:** Because rate limit windows are calculated relative to `Date.now()`, wide system clock variations (>100ms) between multiple bot servers will lead to uneven window evaluations. Keep system clocks aligned using NTP/Chrony.
