# Observability Correlation Schema

This document defines the schema of keys, log fields, and telemetry attributes for TGWrapper observability signals, ensuring consistency across logs, metrics, and distributed traces.

---

## 🔑 1. Correlation Context Keys

To correlate events across distributed boundaries, all observability signals must include the following fields:

| Field Name | Type | Source / Origin | Description |
| :--- | :--- | :--- | :--- |
| `trace_id` | string | `AsyncLocalStorage` | Unique 32-character hexadecimal OpenTelemetry trace ID. |
| `span_id` | string | `AsyncLocalStorage` | Unique 16-character hexadecimal span ID. |
| `update_id` | integer | Telegram payload | The unique `update_id` provided by Telegram. |
| `chat_id` | integer | Telegram payload | Target chat identifier for user interactions. |
| `user_id` | integer | Telegram payload | User identifier (optional, redacted/hashed if sensitive). |
| `bot_id` | string | Environment Config | Unique string identifier of the bot service. |
| `handler_name` | string | In-code route | The name of the routing handler executed. |
| `transport` | string | Client config | Ingest protocol, e.g. `polling` or `webhook`. |
| `runtime` | string | Execution Env | Host runtime, e.g. `node`, `workerd`, `lambda`. |

---

## 🔀 2. Logging Bindings & Trace Propagation

When executing async operations (such as fetching data or running AI prompts), the active execution context must propagate these correlation keys.

```
  [Update Ingest: update_id=987] ──> [Generate trace_id=abc123xyz]
                                             │
                                             ├──> Log: "Received update" (includes trace_id)
                                             │
                                             └──> Async fetch (header: traceparent=00-abc123xyz...)
```

### Log Instrumentation Example
When writing custom log statements, verify that the active telemetry wrapper extracts context identifiers automatically:
```typescript
import { ContextStore } from '@tgwrapper/observability';

const context = ContextStore.getStore();
logger.info({
  event: "database.query",
  queryName: "getUserProfile",
  trace_id: context?.traceId,
  update_id: context?.updateId,
  chat_id: context?.chatId
}, "Fetching user record from DB.");
```
Using the standard correlation keys ensures logs can be easily filtered and analyzed on APM dashboards (e.g. Datadog, Kibana, Loki).
