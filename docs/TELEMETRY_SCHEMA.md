# Telemetry Schema Contract

This document serves as the formal schema contract for all observability signals emitted by `@tgwrapper/observability`.

---

## 📊 1. Metrics Schema

Metrics are registered in the `MetricsRegistry` and can be scraped via Prometheus or logged inside JSON events.

| Metric Name | Type | Unit | Labels | Description |
| :--- | :--- | :--- | :--- | :--- |
| `updates_received_total` | Counter | integer | `mode` | Cumulative count of incoming Telegram updates. |
| `updates_errors_total` | Counter | integer | `error_class` | Cumulative count of handler exceptions. |
| `update_duration_ms` | Histogram | milliseconds | `update_type` | Duration of update ingestion to completion. |
| `ratelimit_blocked_total` | Counter | integer | `namespace` | Number of requests rejected by the rate limiter. |
| `session_conflict_total` | Counter | integer | `bot_id` | Count of atomic CAS version conflicts. |

---

## 🕵️ 2. OpenTelemetry Spans Schema

Traces are modeled as hierarchically nested spans.

### Core Span: `update_processing`
The root span enclosing the entire lifecycle of a single incoming update event.
- **Attributes:**
  - `tgwrapper.update_id` (integer): Telegram update identifier.
  - `tgwrapper.update_type` (string): e.g. `message`, `callback_query`.
  - `tgwrapper.chat_id` (integer, optional): ID of the chat.

### Session Span: `session_load` / `session_save`
Measures read and write performance on persistent storage.
- **Attributes:**
  - `session.id` (string): Normalized session identifier.
  - `session.operation` (string): `read` or `write`.
  - `session.cas_conflict` (boolean): `true` if the CAS write step failed with a version conflict.

### Optional Span: `ai_generation`
Captures downstream LLM client invocation metadata.
- **Attributes:**
  - `llm.provider` (string): e.g., `openai`, `anthropic`.
  - `llm.usage.prompt_tokens` (integer): Input count tokens.
  - `llm.usage.completion_tokens` (integer): Output count tokens.
  - `llm.usage.total_tokens` (integer): Total tokens cost.

---

## 📝 3. Structured JSON Logs Schema

Logs are emitted to stdout as serialized single-line JSON structures.

### Standard Field Envelope
```json
{
  "timestamp": "2026-06-04T12:00:00.000Z",
  "level": "INFO",
  "serviceName": "telegram-bot",
  "traceId": "8f8b8a8b8c8d8e8f8a8b8c8d8e8f8a8b",
  "updateId": 987654321,
  "event": "update.processed",
  "durationMs": 42
}
```

---

## 🔗 4. Context Correlation Model

Trace propagation utilizes Node's standard `AsyncLocalStorage` boundary scopes.

- **`traceId` Extraction:** A unique trace identifier is generated at the start of every update intake.
- **Propagation Hook:** Any log event, outgoing HTTP request, or child spans started within the update handler scope automatically inherits this matching `traceId`.
- **Log Correlation:** Ensure your database and AI adapters extract and output this field from the active telemetry context:
  ```typescript
  import { ContextStore } from '@tgwrapper/observability';
  
  const currentContext = ContextStore.getStore();
  const traceId = currentContext?.traceId;
  ```
