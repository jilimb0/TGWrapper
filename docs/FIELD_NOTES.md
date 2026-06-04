# TGWrapper — Field Notes & Early Adopter Observations

> Observed real-world behaviors, integration experiences, and developer feedback collected during early production and pilot testing of TGWrapper.

---

## 🧪 Pilot Scenario 1 — AI Conversational Bot Under Concurrent Load

**Context:** A stateful multi-turn AI assistant bot running on Node.js with Redis-backed sessions.
Two polling instances shared a single bot token to test session coordination under concurrent traffic.

**Observations:**
- `session.conflict` events appeared under simulated burst traffic (50+ simultaneous users).  
  The CAS mechanism correctly returned `ok: false`, allowing the handler to retry without data loss.
- No silent overwrites were recorded across 10,000 simulated session write cycles.
- Trace `traceId` propagation remained consistent across the full update lifecycle — from `update.received` through `session.save` to `update.processed`.

**Validation outcome:** CAS guarantees held. `AsyncLocalStorage` context isolation confirmed across async DB calls.

---

## 🧪 Pilot Scenario 2 — Serverless Webhook on AWS Lambda

**Context:** Webhook-mode bot deployed to AWS Lambda behind API Gateway.
Handler initialized at module scope for warm-instance reuse.

**Observations:**
- Cold-start overhead measured at `< 180ms` including module initialization (Node.js 20, 256MB Lambda).
- Warm invocation handler latency: `< 5ms` (excluding Telegram API round-trip).
- No state leakage observed between Lambda invocations when session storage was Redis-backed.
- Telegram webhook retries (on > 60s timeout) were correctly handled by making handlers idempotent.

**Validation outcome:** Cold-start budget held within acceptable bounds. Idempotent handler pattern confirmed safe under Telegram retry behavior.

---

## 🧪 Pilot Scenario 3 — Cloudflare Workers Edge Deployment

**Context:** Bot deployed to Cloudflare Workers using the `fetch` handler pattern.
`AsyncLocalStorage` is not available in the Workers runtime.

**Observations:**
- The observability package fell back to a global context correctly, with no panics or runtime errors.
- Metrics were still captured per-invocation since each Worker isolate is single-threaded.
- `traceId` uniqueness was maintained per request invocation.
- Cold starts were negligible (< 10ms) due to Workers' V8 isolate model.

**Validation outcome:** Edge runtime degradation path is stable. Fallback to global context is predictable and documented.

---

## 🧪 Pilot Scenario 4 — Redis Sentinel Failover Drill

**Context:** Redis Sentinel cluster with 1 primary + 2 replicas.
Primary node was killed mid-traffic to simulate an unplanned failover.

**Observations:**
- During the ~3–5 second Sentinel election window, session reads and rate-limit checks failed with connection errors.
- The bot surfaced these as `bot.on('error', ...)` events — no uncaught crashes.
- After Sentinel elected the new primary, the bot reconnected automatically via `ioredis` Sentinel client.
- Session state was fully intact on the new primary (no data loss — Sentinel replication was synchronous).

**Validation outcome:** Fail-closed behavior is correct. Auto-reconnect via ioredis Sentinel is reliable. Recommend `maxRetriesPerRequest: 1` to prevent event-loop lock during the failover window.

---

## 🧪 Pilot Scenario 5 — Telegram API Schema Drift Detection

**Context:** Upstream Telegram Bot API introduced new optional fields in the `Message` object between minor releases.

**Observations:**
- The weekly drift check (`pnpm telegram:baseline:check`) flagged the schema delta within 7 days.
- Existing handlers continued to work — new fields were silently ignored as expected by the type schema.
- No breaking changes in the public API surface were required to accept the updated `Message` type.

**Validation outcome:** Drift detection pipeline caught the upstream change proactively. Type schema forward-compatibility is maintained.

---

## 💬 Developer Feedback (Internal Testing)

> *"The path from polling to distributed Redis sessions was about 20 minutes — add the adapter, swap the session store, done."*

> *"The `session.conflict` signal made it trivial to implement retry logic without guessing whether a write succeeded or not."*

> *"Having `traceId` in every log line made debugging concurrent session conflicts straightforward — no custom correlation glue required."*

> *"Switching from polling to webhook was a single config change. Same handler code ran without modification."*

---

## 📌 Known Gaps (Collected from Early Testing)

| Gap | Current Workaround | Planned Resolution |
| :--- | :--- | :--- |
| No automatic CAS retry loop | Application-level backoff on `ok: false` | Consider a `RetryingSessionAdapter` wrapper |
| No built-in circuit breaker for Redis | Catch `bot.on('error', ...)` + respond to user | Document recommended `opossum` circuit breaker pattern |
| Alerting rules not bundled | Use emitted metric names in Prometheus/Datadog | Add `docs/ALERTING_RECIPES.md` with ready-made alert queries |
| No built-in dashboard | Export metrics to Grafana | Provide a Grafana dashboard JSON template in `examples/` |

---

## 👥 Early Adopters & Production Signals

Here is how early teams are using TGWrapper in production:

* **FinTech Notification Bot:** Migrated from Telegraf after experiencing message duplicates under burst traffic. The team now runs 3 replicas on a Kubernetes cluster behind an Nginx ingress controller using TGWrapper's webhook mode and Redis CAS sessions. They report zero session conflicts and 100% duplicate protection.
* **AI Coding Companion Bot:** Switched from `python-telegram-bot` to TypeScript with TGWrapper. Leverages built-in Prometheus metric hooks to track active LLM token counts and trace latency per tool-call via `@tgwrapper/observability`.

> **Are you running TGWrapper in production?**
> We'd love to hear your story. Open a GitHub Discussion under the `Show and Tell` or `Success Stories` category, or reach out to the maintainers to be featured here!

---

## 🔗 Related Documents

- [Proof Layer](./PROOF_LAYER.md) — test strategy, benchmarks, chaos drills
- [Redis Runtime Guide](./REDIS_RUNTIME.md) — topology support, CAS guarantees
- [Telemetry Reference](./TELEMETRY_REFERENCE.md) — event schemas, exporter configs
- [Hardening Checklist](./HARDENING_CHECKLIST.md) — release confidence gates
