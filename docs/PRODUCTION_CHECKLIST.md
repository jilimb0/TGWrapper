# Production Checklist (1.0)

## 1) Webhook Security

- Configure `WEBHOOK_SECRET` and validate secret header via `WebhookHandler`.
- Enforce HTTPS/TLS termination at ingress.
- Restrict ingress paths to webhook endpoint only.
- Ensure bot token is injected from secret manager.

## 2) Redis Durability and Session Safety

- Use managed Redis with persistence aligned to your RPO/RTO.
- Monitor Redis latency and memory pressure.
- Track session conflict metric (`session_conflict_count`).
- Validate encryption-required session invariant in staging.

## 3) Concurrency and Tenant Controls

- Set bounded queue capacity to match worker memory limits.
- Configure tenant token bucket limits from expected traffic profile.
- Monitor:
  - `runtime_dropped_rate_limited`
  - `runtime_dropped_queue_overflow`
- Keep sustained queue overflow under 0.1%.

## 4) Release and Rollback

- Publish only via CI release workflow from `main`.
- Require `verify:1.0` for release candidates and final release.
- Rollback strategy: publish forward fix patch (npm versions are immutable).

## 5) Observability and Incident Readiness

- Implement dashboard from `/Users/jilimbo/Documents/Personal/TGWrapper/docs/OBSERVABILITY_CONTRACT.md`.
- Link alerts to runbook actions in `/Users/jilimbo/Documents/Personal/TGWrapper/docs/OPERATIONS_RUNBOOK.md`.
- Verify on-call runbook for Redis degraded and Telegram outage scenarios.
