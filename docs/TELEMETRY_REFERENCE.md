# Telemetry Reference

> Package: `@tgwrapper/observability` · Stability: Beta · Runtime: Node.js `>=22.13` · Last updated: 2026-06
>
> See [docs/API_STABILITY.md](./API_STABILITY.md) for the canonical stability policy.

This document is the authoritative reference for TGWrapper's observability layer. It covers the event schema, all emitted metric names, supported exporter configurations, a debugging cookbook, and known limitations.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Event Schema Reference](#2-event-schema-reference)
3. [Metrics Reference](#3-metrics-reference)
4. [Exporter Matrix](#4-exporter-matrix)
5. [Configuration Reference](#5-configuration-reference)
6. [Debugging Cookbook](#6-debugging-cookbook)
7. [Grafana Dashboard Layout](#7-grafana-dashboard-layout)
8. [Known Limitations](#8-known-limitations)

---

## 1. Overview

TGWrapper's observability layer is built on three primitives:

| Primitive             | Purpose                        | Implementation                 |
| --------------------- | ------------------------------ | ------------------------------ |
| **Structured events** | Discrete lifecycle log entries | Custom `logger` interface      |
| **Metrics**           | Counters and gauges over time  | `MetricsRegistry` (pull-based) |
| **Trace context**     | Request-scoped correlation IDs | `AsyncLocalStorage`            |

The entry point is `attachBotObservability()`, which hooks into the bot's internal event bus and wraps update processing with trace context injection.

```typescript
import {
  attachBotObservability,
  MetricsRegistry,
} from "@tgwrapper/observability"

const metrics = new MetricsRegistry()
attachBotObservability(bot, {
  metrics,
  logger: { log: (evt) => console.log(JSON.stringify(evt)) },
  serviceName: "my-bot",
  tenantId: "acme",
  botId: "support-bot",
})
```

---

## 2. Event Schema Reference

Every event emitted through the logger follows this base schema:

```typescript
interface TelemetryEvent {
  // --- Identity fields ---
  serviceName: string // value from attachBotObservability config
  tenantId: string // value from attachBotObservability config
  botId: string // value from attachBotObservability config

  // --- Envelope ---
  event: string // event type name (see table below)
  level: "debug" | "info" | "warn" | "error"
  timestamp: string // ISO 8601 UTC, e.g. "2026-06-03T14:00:00.000Z"
  traceId: string // UUID v4, unique per update lifecycle

  // --- Payload ---
  data: Record<string, unknown> // event-specific fields (see below)
}
```

### 2.1 Event Type Catalogue

| Event Name          | Level   | Emitted When                          | Key `data` Fields                                        |
| ------------------- | ------- | ------------------------------------- | -------------------------------------------------------- |
| `bot.start`         | `info`  | `bot.start()` completes               | `mode: 'polling' \| 'webhook'`                           |
| `bot.stop`          | `info`  | `bot.stop()` completes                | `uptimeMs: number`                                       |
| `update.received`   | `debug` | Raw update arrives                    | `updateId`, `updateType`                                 |
| `update.processed`  | `info`  | Handler chain completes without error | `updateId`, `durationMs`, `updateType`                   |
| `update.error`      | `error` | Unhandled error in handler chain      | `updateId`, `updateType`, `error.message`, `error.stack` |
| `ratelimit.blocked` | `warn`  | Rate limiter denies a request         | `key`, `retryAfterMs`                                    |
| `session.read`      | `debug` | Session loaded from store             | `sessionKey`, `hit: boolean`                             |
| `session.write`     | `debug` | Session persisted to store            | `sessionKey`, `version`                                  |
| `session.conflict`  | `warn`  | CAS write rejected (version mismatch) | `sessionKey`, `expectedVersion`                          |
| `metric.flush`      | `debug` | MetricsRegistry snapshot taken        | `counters: Record<string,number>`                        |

### 2.2 Example: `update.processed` Event

```json
{
  "serviceName": "support-bot",
  "tenantId": "acme",
  "botId": "support-bot-v2",
  "event": "update.processed",
  "level": "info",
  "timestamp": "2026-06-03T14:01:23.456Z",
  "traceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "data": {
    "updateId": 987654321,
    "updateType": "message",
    "durationMs": 47
  }
}
```

### 2.3 Example: `update.error` Event

```json
{
  "serviceName": "support-bot",
  "tenantId": "acme",
  "botId": "support-bot-v2",
  "event": "update.error",
  "level": "error",
  "timestamp": "2026-06-03T14:02:00.000Z",
  "traceId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "data": {
    "updateId": 987654322,
    "updateType": "message",
    "error": {
      "message": "Cannot read properties of undefined (reading 'id')",
      "stack": "TypeError: Cannot read properties..."
    }
  }
}
```

---

## 3. Metrics Reference

`MetricsRegistry` maintains in-process counters. Call `.snapshot()` to get current values.

### 3.1 Available Metric Names

| Metric Key                 | Type    | Description                                        |
| -------------------------- | ------- | -------------------------------------------------- |
| `updates_received_total`   | Counter | Total raw updates received since start             |
| `updates_processed_total`  | Counter | Updates successfully processed (no error)          |
| `updates_error_total`      | Counter | Updates that produced an unhandled error           |
| `ratelimit_blocked_total`  | Counter | Updates blocked by rate limiter                    |
| `session_read_total`       | Counter | Session load operations                            |
| `session_write_total`      | Counter | Session persist operations                         |
| `session_conflict_total`   | Counter | CAS write conflicts                                |
| `update_duration_ms_sum`   | Counter | Cumulative handler duration (ms), for average calc |
| `update_duration_ms_count` | Counter | Number of timed handler executions                 |

### 3.2 Deriving Averages

```typescript
const snap = metrics.snapshot()
const avgDurationMs =
  snap["update_duration_ms_count"] > 0
    ? snap["update_duration_ms_sum"] / snap["update_duration_ms_count"]
    : 0
```

### 3.3 Exposing via HTTP (Prometheus-style)

```typescript
import http from "node:http"

const server = http.createServer((req, res) => {
  if (req.url === "/metrics") {
    const snap = metrics.snapshot()
    const body = Object.entries(snap)
      .map(([k, v]) => `tgwrapper_${k} ${v}`)
      .join("\n")
    res.writeHead(200, { "Content-Type": "text/plain" })
    res.end(body)
  } else {
    res.writeHead(404)
    res.end()
  }
})
server.listen(9090)
```

---

## 4. Exporter Matrix

The `logger` option accepts any object implementing `{ log(event: TelemetryEvent): void }`. Use the table below to choose the right integration.

| Target                   | Approach                                                | Notes                                     |
| ------------------------ | ------------------------------------------------------- | ----------------------------------------- |
| **Console (dev)**        | `{ log: (e) => console.log(JSON.stringify(e)) }`        | Built-in, zero deps                       |
| **Pino**                 | `{ log: (e) => pino.child(e).info(e.event) }`           | Structured, high perf                     |
| **Winston**              | `{ log: (e) => winston.log(e.level, e.event, e.data) }` | Widely supported                          |
| **Datadog (dd-trace)**   | Wrap with `dd-trace` span creation inside `log()`       | Requires `dd-trace` init before bot start |
| **OpenTelemetry**        | Use the built-in OTEL bridge from `otel.ts`             | See section 4.1 below                     |
| **Google Cloud Logging** | `{ log: (e) => gcpLogger.write(gcpLogger.entry(e)) }`   | Use `@google-cloud/logging`               |
| **AWS CloudWatch**       | `{ log: (e) => cloudwatch.putLogEvents(...) }`          | Batch for cost efficiency                 |

### 4.1 OpenTelemetry Bridge

TGWrapper ships an OTEL bridge in `otel.ts` that maps `TelemetryEvent` to OTEL spans:

```typescript
import { createOtelLogger } from "@tgwrapper/observability"
import { NodeSDK } from "@opentelemetry/sdk-node"

// Initialize your OTEL SDK first
const sdk = new NodeSDK({
  /* exporter config */
})
sdk.start()

// Then create the bridge logger
const otelLogger = createOtelLogger({ tracer: trace.getTracer("tgwrapper") })

attachBotObservability(bot, {
  metrics,
  logger: otelLogger,
  serviceName: "my-bot",
  tenantId: "acme",
  botId: "my-bot",
})
```

Each `update.received` creates an OTEL span. Child operations (session reads/writes, rate limit checks) are attached as span events.

---

## 5. Configuration Reference

```typescript
interface ObservabilityConfig {
  /** Required: MetricsRegistry instance */
  metrics: MetricsRegistry

  /** Required: Logger implementing { log(event): void } */
  logger: { log(event: TelemetryEvent): void }

  /** Required: Human-readable service name (appears in all events) */
  serviceName: string

  /** Required: Tenant identifier for multi-tenant setups */
  tenantId: string

  /** Required: Bot identifier, useful when running multiple bots in one service */
  botId: string

  /** Optional: Minimum log level to emit (default: 'debug') */
  minLevel?: "debug" | "info" | "warn" | "error"

  /** Optional: Whether to include error stack traces in update.error events (default: true) */
  includeStacks?: boolean
}
```

---

## 6. Debugging Cookbook

### Recipe 1: Find all errors in the last hour

If using a JSON-line log file:

```bash
grep '"event":"update.error"' bot.log | \
  jq 'select(.timestamp > "2026-06-03T13:00:00Z")'
```

### Recipe 2: Trace a specific update end-to-end

```bash
grep '<traceId>' bot.log | jq '.'
```

All events for a single update share the same `traceId`. Grep for it to reconstruct the full lifecycle.

### Recipe 3: Detect session conflict spikes

```bash
grep '"event":"session.conflict"' bot.log | wc -l
```

If this count is growing rapidly, you likely have a hot session key under concurrent writes. Consider adding retry logic with exponential backoff.

### Recipe 4: Measure handler p95 latency (offline)

```bash
grep '"event":"update.processed"' bot.log | \
  jq '.data.durationMs' | \
  sort -n | \
  awk 'BEGIN{c=0} {a[c++]=$1} END{print a[int(c*0.95)]}'
```

### Recipe 5: Check if rate limiter is too aggressive

```bash
# Count blocked vs processed ratio
BLOCKED=$(grep '"event":"ratelimit.blocked"' bot.log | wc -l)
PROCESSED=$(grep '"event":"update.processed"' bot.log | wc -l)
echo "Block ratio: $BLOCKED / $((BLOCKED + PROCESSED))"
```

If block ratio > 5%, consider increasing `limit` or `windowMs` in your rate limiter config.

---

## 7. Grafana Dashboard Layout

When scraping the Prometheus-style `/metrics` endpoint, the following panel layout is recommended:

```
Row 1: Health Overview
├── [Stat]   updates_received_total        — total traffic
├── [Stat]   updates_error_total           — error count
└── [Gauge]  error rate (error/received)   — error %

Row 2: Performance
├── [Graph]  update_duration_ms_sum / update_duration_ms_count  — avg latency
└── [Graph]  updates_processed_total rate                        — throughput

Row 3: Redis Coordination
├── [Stat]   ratelimit_blocked_total       — spam protection hits
├── [Stat]   session_conflict_total        — CAS conflicts
└── [Stat]   session_write_total           — write volume

Row 4: Logs Panel
└── [Logs]   Filter: level=error, or event=session.conflict
```

A community-contributed Grafana dashboard JSON will be published at `docs/grafana-dashboard.json` once the Beta validation phase is complete.

---

## 8. Known Limitations

- **Pull-based metrics only.** `MetricsRegistry` does not push metrics automatically. You must expose an HTTP endpoint or call `.snapshot()` on a schedule.
- **No histogram buckets.** Latency is tracked as sum+count only. True p50/p95/p99 requires external aggregation or switching to an OTEL histogram metric.
- **AsyncLocalStorage scope.** Trace context is propagated only within the same async call tree. If you use `setImmediate` or worker threads, context may be lost.
- **No sampling.** All `debug`-level events are emitted. In high-traffic bots (>1000 updates/min), use `minLevel: 'info'` to reduce log volume.
- **Beta API.** The event schema and metric names are stable for the current minor version but may evolve in 0.x releases. Pin your parser to the version you validated against.
