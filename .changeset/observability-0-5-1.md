---
"@jilimb0/tgwrapper-observability": patch
---

Finalize APM package hardening for the 0.5.1 line.

- add full tracing lifecycle with async context propagation and correlation IDs
- add unified telemetry registry with counter/gauge/histogram/updown-counter
- add exporter pipeline with retries/backoff/circuit breaker and graceful flush
- add process telemetry, diagnostics snapshots, and fail-open reliability behavior
- add wrappers for update/api/db/queue/scheduler instrumentation
- add logging controls (runtime level override, sampling, redaction) and telemetry safety guards
- add docs and tests for APM contract and integrations
