# Observability Contract

## Stable APIs

The following APIs are stable and intended for direct application use:

- `trackAsync(metrics, metricName, fn, tags?)`
- `createTimer(metrics, metricName, tags?)`
- `attachBotObservability(botOrRuntime, options)`
- `InMemoryMetrics.snapshot()`

## Metric naming conventions

- Use `snake_case` names.
- Use prefixes:
  - `bot_` for app/runtime metrics
  - `telegram_` for Telegram transport/API metrics
  - `session_` for storage/session consistency
- Allowed tags:
  - `service`
  - `method`
  - `update_type`
  - `tenant` (only if bounded)

Do not use high-cardinality identifiers (`user_id`, `chat_id`, `message_id`) as metric tags.

## Snapshot schema

`InMemoryMetrics.snapshot()` returns:

- `timestamp: string`
- `counters: Record<string, number>`
- `histograms: Record<string, { count, p50, p95, min, max }>`

This schema is stable and can be exported to `/metrics` or diagnostic endpoints.

## Redaction

Use `attachBotObservability(..., { redact })` to remove PII before logging.

Example redactor:

```ts
const redact = (data) => {
  if (!data) return data;
  const copy = { ...data };
  delete copy.text;
  delete copy.caption;
  return copy;
};
```

## Core metrics

| Metric | Type | Tags | Meaning |
|---|---|---|---|
| `bot_launch_total` | counter | `service` | Bot runtime starts |
| `bot_shutdown_total` | counter | `service` | Bot runtime stops |
| `bot_update_total` | counter | `service`, `update_type` | Processed updates |
| `bot_runtime_error_total` | counter | `service` | Runtime errors |
| `bot_api_call_total` | counter | `service`, `method` | API call attempts |
| `bot_api_error_total` | counter | `service`, `method` | API call errors |
| `bot_api_latency_ms` | histogram | `service`, `method` | API latency |
