# When To Add Redis

Start without Redis when your bot is a single process, state is disposable, and local simplicity matters more than distributed consistency.

Add `@tgwrapper/adapter-redis` when one or more of these thresholds become true:

| Signal | Why Redis Helps |
| --- | --- |
| You run 2+ instances with the same bot token | Shared sessions and shared rate limits prevent per-instance divergence. |
| User state must survive restarts | Redis provides external session storage with TTL. |
| Users can trigger concurrent state transitions | CAS writes return explicit conflicts instead of silently overwriting newer state. |
| Rate limits must apply across the fleet | Redis ZSET windows are shared across instances. |
| You need operational visibility into state contention | CAS conflict counts become a meaningful production signal. |

## Do Not Add Redis Just Because

- A toy bot does not need it.
- A single-process polling bot can use in-memory state.
- A serverless bot without a persistent Redis-compatible service may pay too much connection overhead.

## Migration Path

1. Define a versioned session shape with `version: number`.
2. Add `@tgwrapper/adapter-redis` and `ioredis`.
3. Configure a Redis client and namespace.
4. Replace in-memory session reads/writes with `RedisSessionAdapter`.
5. Handle `ok: false` CAS conflicts explicitly.
6. Add dashboards for Redis latency, CAS conflicts, limiter rejects, and reconnects.

## Production Readiness Gate

Before calling the Redis path production-ready, verify:

- Redis is monitored and backed up.
- Server clocks are synchronized.
- Eviction policy is understood.
- Hotspot keys have retry/backoff behavior.
- Redis outage behavior is documented for your bot.

