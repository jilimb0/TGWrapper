# Observability Contract (0.5.0)

## Metric naming and tags

- Use snake_case metric names.
- Keep tag set bounded and low-cardinality.
- Supported common tags:
  - `tenant`
  - `method`

## Metrics

| Metric | Type | Unit | Tags | Meaning | Cardinality | Alert candidate |
|---|---|---|---|---|---|---|
| `telegram_api_latency_ms` | histogram | milliseconds | `method` | End-to-end Telegram API call latency | low (per API method) | p95 > 250ms sustained |
| `transport_retries` | counter | count | `method` | Retry attempts caused by retryable transport/API errors | low | sudden spike vs baseline |
| `circuit_breaker_open_count` | counter | count | `method` | Circuit breaker open events | low | any sustained non-zero rate |
| `session_conflict_count` | counter | count | none | CAS/session update conflicts | low | conflict rate above target |
| `runtime_dropped_rate_limited` | counter | count | `tenant` | Updates dropped by tenant rate limiter | medium (tenant count) | noisy tenant or global spike |
| `runtime_dropped_queue_overflow` | counter | count | `tenant` | Updates dropped due to bounded queue overflow | medium (tenant count) | >0.1% of processed updates |

## Notes for collectors

- In-memory collector is a reference implementation for tests/local validation.
- Production sink should preserve metric names and tag semantics above.
- Do not attach high-cardinality tags (request IDs, user IDs, message IDs).
