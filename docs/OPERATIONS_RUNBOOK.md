# Operations Runbook

## Incident: Redis degraded

1. Verify Redis health (`PING`, latency, memory pressure).
2. Check `session_conflict_count` and queue overflow metrics.
3. If saturation is high, reduce tenant rate limits and increase worker replicas.
4. If Redis unavailable, fail fast for stateful routes and keep stateless webhook validation path alive.
5. After recovery, validate monotonic session versions on hot keys.

## Incident: Telegram API outage / high 429

1. Confirm `circuit_breaker_open_count` trend.
2. Check `transport_retries` and API latency p95.
3. Reduce outbound fan-out and enable stricter tenant limits.
4. Keep webhook 200 responses when updates are accepted for deferred handling.
5. Recover by observing breaker half-open success and retry stabilization.

## Queue overflow

1. Inspect `runtime_dropped_queue_overflow` per tenant.
2. Identify noisy tenant and adjust token bucket limits.
3. Scale workers horizontally if sustained overflow > SLO threshold.

## Post-incident checks

1. No session corruption in recent state transitions.
2. p95 processing latency back within SLO.
3. Alert noise resolved and dashboards stable.
