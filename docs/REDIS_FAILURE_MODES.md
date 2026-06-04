# Redis Failure Modes & Behavior Matrix

This matrix outlines how TGWrapper and `@tgwrapper/adapter-redis` behave during Redis failures, along with recommended mitigation paths.

---

## 📊 Failure Modes Matrix

| Scenario / Failure Mode | Observed Symptom | Expected Framework Behavior | Fail Choice | User-Visible Risk | Recommended Operator Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Redis Down on Startup** | Startup fails with connection exception; process halts. | `RedisSessionAdapter` throws a connection error; client refuses to start. | `Fail-Closed` | Bot remains offline. | Verify Redis connection URL; inspect firewall rules and network ports. |
| **Redis Drops During Traffic** | Session and rate limit calls throw timeout exceptions. | Active handlers fail with `SessionError` or `LimiterError`. Update loop continues but rejects updates. | `Fail-Closed` | Bot ignores clicks or replies with error alerts. | Check Redis CPU and memory load; monitor network routes. `ioredis` will auto-retry connections. |
| **High Redis Latency (> 50ms)** | Update processing durations spike; handler queues bloat. | Telemetry logs `update_duration_ms` spikes. Webhook handlers exceed 5s limits. | `Degraded` | Users experience sluggish bot responses or duplicate replies. | Run `SLOWLOG GET` to locate slow operations; check CPU usage on Redis shard. |
| **Session CAS Contention** | Warnings in logs for `session.conflict`. | CAS check returns `ok: false`. The write is discarded, and the session state version does not increment. | `Fail-Closed` | Concurrent clicks by the same user are ignored or fail. | Implement exponential backoff retry loops on session mutations. |
| **TTL Key Eviction Drift** | Session state resets to initial state defaults unexpectedly. | A session fetch returns `null` because the key was evicted or expired. | `Reset` | User progress or active wizard flows are lost. | Increase session `ttlSeconds` values; verify Redis `maxmemory-policy` settings. |
| **Read-After-Write Inconsistency** | CAS checks fail repeatedly on multi-instance setups. | Stale reads from read-replica nodes cause CAS version checks to fail. | `Fail-Closed` | Session updates fail consistently under fast tapping. | **Do not route session reads to read replicas.** Route all session traffic to primary master nodes. |
