# Production Checklist (0.5.0)

## 1) Webhook security

- Configure `WEBHOOK_SECRET` and validate secret header via `WebhookHandler`.
- Enforce HTTPS/TLS termination at ingress.
- Restrict ingress paths to webhook endpoint only.
- Ensure bot token is provided via secret manager, never hardcoded.

## 2) Redis durability and session safety

- Use managed Redis with persistence settings suitable for your RPO/RTO.
- Monitor Redis latency and memory pressure continuously.
- Validate CAS/session conflict rates (`session_conflict_count`) against expected tenant load.
- If using encryption-required sessions, verify encrypted session invariant in staging.

## 3) Concurrency and tenant controls

- Set bounded concurrency queue capacity according to worker memory limits.
- Configure token bucket limits per tenant based on expected traffic profile.
- Monitor:
  - `runtime_dropped_rate_limited`
  - `runtime_dropped_queue_overflow`
- Keep queue overflow under 0.1% sustained for steady traffic.

## 4) Release and rollback flow

- Use CI-only publish flow from `main` via Release workflow.
- Validate publish dry-run and OIDC preflight before release.
- Rollback strategy:
  - npm package versions are immutable, so rollback = publish forward fix patch.
  - keep previous deployment artifact for rapid runtime rollback.

## 5) Observability and incident readiness

- Implement dashboard for metrics in `/Users/jilimbo/Documents/Personal/TGWrapper/docs/OBSERVABILITY_CONTRACT.md`.
- Link alerts to runbook actions in `/Users/jilimbo/Documents/Personal/TGWrapper/docs/OPERATIONS_RUNBOOK.md`.
- Verify on-call can execute Redis degraded and Telegram outage procedures.
