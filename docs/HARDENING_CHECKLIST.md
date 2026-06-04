# TGWrapper — Hardening Checklist

> A structured release-confidence gate. Run through this checklist before every production release or major deployment.

---

## ✅ How to Use This Checklist

- Go section by section.
- All **[REQUIRED]** items must pass before release.
- **[RECOMMENDED]** items are strongly advised for production deployments.
- **[OPTIONAL]** items apply only to specific deployment patterns.

---

## 1. Build & Type Safety

| # | Check | Level |
| :-- | :--- | :--- |
| 1.1 | `pnpm build` completes with zero errors across all packages | **[REQUIRED]** |
| 1.2 | `pnpm test` passes all 21+ test files with zero failures | **[REQUIRED]** |
| 1.3 | `pnpm typecheck` (or `tsc --noEmit`) reports zero type errors | **[REQUIRED]** |
| 1.4 | No `any` casts introduced in public API surface | **[REQUIRED]** |
| 1.5 | ESM and CJS dual-build outputs are present in `dist/` | **[REQUIRED]** |
| 1.6 | Bundle footprint stays under 42KB compressed (monitored by build script) | **[RECOMMENDED]** |

---

## 2. Telegram API Compatibility

| # | Check | Level |
| :-- | :--- | :--- |
| 2.1 | `pnpm telegram:baseline:check` — no schema drift detected | **[REQUIRED]** |
| 2.2 | `pnpm telegram:schema:types:check` — all type mappings are current | **[REQUIRED]** |
| 2.3 | `pnpm telegram:schema:payloads:check` — payload shape matches upstream | **[REQUIRED]** |
| 2.4 | `pnpm telegram:schema:results:check` — result types are correct | **[REQUIRED]** |
| 2.5 | New Telegram API fields that are optional are typed as `T | undefined` (not `T`) | **[REQUIRED]** |

---

## 3. Security

| # | Check | Level |
| :-- | :--- | :--- |
| 3.1 | `BOT_TOKEN` is stored in a secret manager or environment secret — never hardcoded | **[REQUIRED]** |
| 3.2 | Webhook mode: `X-Telegram-Bot-Api-Secret-Token` header is validated before calling `bot.ingest()` | **[REQUIRED]** |
| 3.3 | Webhook endpoint enforces HTTPS-only (no HTTP in production) | **[REQUIRED]** |
| 3.4 | Raw update payloads containing user messages are **not** logged to persistent storage | **[REQUIRED]** |
| 3.5 | Redis URL (`REDIS_URL`) does not contain plaintext credentials in application logs | **[REQUIRED]** |
| 3.6 | `WEBHOOK_SECRET` is a cryptographically random string (≥ 32 chars) | **[RECOMMENDED]** |
| 3.7 | Redis TLS enabled for production deployments | **[RECOMMENDED]** |
| 3.8 | Redis `AUTH` password set and rotated on a schedule | **[RECOMMENDED]** |

---

## 4. Runtime Lifecycle

| # | Check | Level |
| :-- | :--- | :--- |
| 4.1 | `bot.on('error', handler)` is registered before `bot.start()` | **[REQUIRED]** |
| 4.2 | `SIGTERM` and `SIGINT` signal handlers call `await bot.stop()` | **[REQUIRED]** |
| 4.3 | Polling mode: only **one** process polls per bot token | **[REQUIRED]** |
| 4.4 | Webhook mode: handler always returns HTTP `200 OK` even on internal errors (to prevent Telegram retries) | **[REQUIRED]** |
| 4.5 | Webhook mode: handler logic is idempotent (safe if Telegram retries the same update) | **[RECOMMENDED]** |
| 4.6 | Process is supervised (`pm2`, `systemd`, Docker `restart: always`) | **[RECOMMENDED]** |

---

## 5. Redis & State

| # | Check | Level |
| :-- | :--- | :--- |
| 5.1 | Redis keys are namespaced per environment (`prod:`, `staging:`) | **[REQUIRED]** |
| 5.2 | Session TTL is configured (`ttlSeconds`) — no keys with infinite lifetime in production | **[REQUIRED]** |
| 5.3 | `compareAndSet` conflict (`ok: false`) is handled with retry logic in session-mutating handlers | **[REQUIRED]** |
| 5.4 | Redis `maxmemory-policy` is set to `volatile-lru` or `allkeys-lru` | **[REQUIRED]** |
| 5.5 | Redis Cluster deployments use `{hash-tags}` in all key prefixes to ensure same-slot Lua execution | **[REQUIRED]** (Cluster only) |
| 5.6 | Redis Sentinel / Managed Redis: `keepAlive` is enabled in `ioredis` config | **[RECOMMENDED]** |
| 5.7 | `maxRetriesPerRequest: 1` set in `ioredis` to prevent event-loop lock during Redis failover | **[RECOMMENDED]** |
| 5.8 | Redis persistence (`AOF` or `RDB`) is enabled for session durability across Redis restarts | **[RECOMMENDED]** |

---

## 6. Observability & Alerting

| # | Check | Level |
| :-- | :--- | :--- |
| 6.1 | `attachBotObservability(bot, { ... })` is called before `bot.start()` | **[REQUIRED]** |
| 6.2 | Structured logs are forwarded to a persistent backend (not stdout-only in production) | **[RECOMMENDED]** |
| 6.3 | Prometheus `/metrics` endpoint is scraped (or OTLP push is configured) | **[RECOMMENDED]** |
| 6.4 | Alert configured on `updates_errors_total` rising above baseline | **[RECOMMENDED]** |
| 6.5 | Alert configured on `update_duration_ms_sum / count > 1000ms` (P95 latency threshold) | **[RECOMMENDED]** |
| 6.6 | Alert configured on Redis `session.conflict` event rate spike | **[RECOMMENDED]** |
| 6.7 | Metric tag cardinality is low — no user IDs or chat IDs in metric label dimensions | **[REQUIRED]** |
| 6.8 | Span lifecycle: every `Tracer.startSpan()` call has a matching `Tracer.endSpan()` | **[REQUIRED]** |

---

## 7. Rate Limiting

| # | Check | Level |
| :-- | :--- | :--- |
| 7.1 | In-memory `TokenBucketRateLimiter` is **not** used in multi-instance deployments | **[REQUIRED]** |
| 7.2 | `RedisRateLimiter` is used in all multi-node or serverless deployments | **[REQUIRED]** |
| 7.3 | Rate limit `namespace` is scoped appropriately (e.g. separate namespaces for commands vs. callbacks) | **[RECOMMENDED]** |
| 7.4 | Rate limit rejection (`ratelimit.blocked`) is surfaced to the user with a clear message | **[RECOMMENDED]** |
| 7.5 | `blockDurationMs` is tested under load to confirm it prevents burst storms | **[RECOMMENDED]** |

---

## 8. Release Pipeline Gates

| # | Check | Level |
| :-- | :--- | :--- |
| 8.1 | `pnpm verify:release` exits with code `0` | **[REQUIRED]** |
| 8.2 | Changeset file created and committed (`pnpm changeset`) | **[REQUIRED]** |
| 8.3 | CHANGELOG entry is accurate and describes the breaking changes (if any) | **[REQUIRED]** |
| 8.4 | `pnpm benchmark` passes within expected performance budget | **[RECOMMENDED]** |
| 8.5 | `pnpm test:published-smoke` passes against the published package tarball | **[RECOMMENDED]** |
| 8.6 | Redis integration tests pass (`pnpm test:integration`) | **[RECOMMENDED]** |
| 8.7 | All CI pipelines (changeset, verify, release-integrity, redis-integration) are green | **[REQUIRED]** |

---

## 9. Documentation

| # | Check | Level |
| :-- | :--- | :--- |
| 9.1 | Public API changes are reflected in the relevant package `README.md` | **[REQUIRED]** |
| 9.2 | Breaking changes have a migration note in `CHANGELOG.md` or a `MIGRATION_*.md` doc | **[REQUIRED]** |
| 9.3 | New environment variables are documented in `.env.example` of affected examples | **[REQUIRED]** |
| 9.4 | `docs/SYSTEM_ARCHITECTURE.md` updated if component boundaries have changed | **[RECOMMENDED]** |

---

## 🚀 Release Command Sequence

Run in order for a full release validation pass:

```bash
# 1. Build all packages
pnpm build

# 2. Full test suite
pnpm test

# 3. Telegram schema compatibility checks
pnpm telegram:baseline:check
pnpm telegram:schema:types:check

# 4. Release gate
pnpm verify:release

# 5. Optional deep gates
pnpm benchmark
pnpm test:published-smoke
```

---

## 🔗 Related Documents

- [Production Checklist](./PRODUCTION_CHECKLIST.md) — quick runtime operations checklist
- [Proof Layer](./PROOF_LAYER.md) — test strategy, benchmarks, chaos drills
- [Field Notes](./FIELD_NOTES.md) — observed real-world behaviors and edge cases
- [Redis Runtime Guide](./REDIS_RUNTIME.md) — topology, CAS guarantees, failure modes
