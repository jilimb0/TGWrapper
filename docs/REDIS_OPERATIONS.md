# Redis Operational Monitoring Reference

This reference details the telemetry metrics to monitor when using the `@jilimb0/tgwrapper-adapter-redis` package, along with diagnostic patterns for common production incidents.

---

## 📊 Core Telemetry Metrics

Track these indicators in your monitoring tools (e.g., Prometheus, Grafana, Datadog):

| Metric Name | Signal Type | Description | Target Threshold |
| :--- | :--- | :--- | :--- |
| `redis_command_latency_ms` | Histogram | Execution time of Redis calls (especially `EVAL` / `EVALSHA`). | `< 5ms` (p95) |
| `session_conflict_total` | Counter | Number of atomic CAS session update version clashes. | Near zero |
| `ratelimit_blocked_total` | Counter | Number of requests rejected by the sliding window limiter. | Dynamic |
| `redis_reconnects_total` | Counter | Number of connection drop events triggered by the Redis client. | Zero |

---

## 🚨 Incident Playbook: Symptom, Cause & Fix

### Incident 1: High CAS Conflict Rate (`session_conflict_total` spikes)

* **Symptom:** Logs show frequent `session.conflict` warning events. Users report that their button clicks or replies are ignored or result in error messages.
* **Likely Cause:** A fast concurrent flow of update events (such as webhook retries or rapid user clicking) sending multiple updates for the same chat simultaneously.
* **Immediate Actions:**
  1. Inspect the incoming webhook logs to see if duplicate webhook delivery attempts are occurring due to execution timeouts.
  2. Implement a retry fallback mechanism with exponential backoff on the client-side session write handler:
     ```typescript
     async function updateWithRetry(ctx, updateFn, retries = 3) {
       for (let i = 0; i < retries; i++) {
         const res = await ctx.session.update(updateFn);
         if (res.ok) return;
         await new Promise(r => setTimeout(r, Math.random() * 100)); // random backoff
       }
       throw new Error("Session update failed after retries due to contention.");
     }
     ```

### Incident 2: Slow Update Response Latencies (> 1000ms)

* **Symptom:** Grafana alerts trigger on update processing duration. Logs display high handler durations.
* **Likely Cause:** Redis command latency spikes (`EVALSHA` takes > 10ms), or the Redis instance CPU utilization is pegged at 100%.
* **Immediate Actions:**
  1. Run `redis-cli --latency` or query slow query logs (`SLOWLOG GET`) to find time-consuming operations.
  2. Ensure your Redis keyspace is not bloating. Check that your Redis memory eviction policy is explicitly set to `volatile-lru` or `allkeys-lru`.
  3. Verify that your connection pool limits are not saturated.

### Incident 3: Constant Client Reconnections (`redis_reconnects_total` rises)

* **Symptom:** Network connection errors reported by `ioredis`. Bot fails to fetch sessions.
* **Likely Cause:** Managed Redis provider closes idle connections, or network partitioning is occurring between the bot workers and the Redis server.
* **Immediate Actions:**
  1. Adjust client options to configure a TCP Keep-Alive:
     ```typescript
     { keepAlive: 10000 } // Keep-alive ping sent every 10 seconds
     ```
  2. Inspect CPU load and connection counts on the Redis cluster to ensure clients are not exceeding max client limits.
