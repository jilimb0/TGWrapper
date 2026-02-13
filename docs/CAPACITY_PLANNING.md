# Capacity Planning

## Inputs

- expected updates/sec per tenant
- number of active tenants
- average handler latency
- Redis round-trip latency

## Sizing heuristics

- `maxConcurrency` ~= CPU cores * 4 for IO-heavy handlers.
- Queue length should cover <= 2 seconds of burst traffic.
- Token bucket `capacity` should be proportional to tenant SLA tier.

## Baseline targets

- p95 webhook processing <= 250ms
- queue overflow <= 0.1%
- session conflict retries resolved >= 99%

## Tuning loop

1. Run nightly load + chaos jobs.
2. Compare p50/p95/p99 and dropped events.
3. Adjust rate limits and concurrency queue bounds.
4. Re-run and document deltas.
