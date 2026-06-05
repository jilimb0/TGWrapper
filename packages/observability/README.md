# @tgwrapper/observability

> **Metrics, logs, traces and correlation for Telegram bot operations.**
>
> Attach once to get structured JSON events, in-process counters, per-update trace IDs, and OpenTelemetry-compatible span data. Node.js has the strongest context propagation support; serverless and edge runtimes require the caveats below.

```bash
pnpm add @tgwrapper/observability
```

---

## 📡 What you get immediately (Telemetry Snapshot)

| Signal | What it captures |
| :--- | :--- |
| **Structured JSON events** | `bot.start`, `update.received`, `update.processed`, `update.error`, `session.conflict` — every lifecycle event |
| **In-process metrics** | `updates_received_total`, `updates_errors_total`, `update_duration_ms`, `ratelimit_blocked_total` |
| **Trace context** | Unique `traceId` per update propagated through Node.js async paths via `AsyncLocalStorage`; other runtimes may be partial |
| **OTEL spans** | Ready-to-export spans via the OpenTelemetry bridge — works with Jaeger, Tempo, Datadog |
| **AI/LLM traces** | `prompt_tokens`, `completion_tokens`, `ai_generation` span duration per LLM call |

---

## 🚨 Incidents this helps debug

| Incident | Signal to look for |
| :--- | :--- |
| **Bot is slow / sluggish** | `update_duration_ms` — grep `update.processed` where `durationMs > 1000` |
| **Missing Telegram updates** | Compare `updates_received_total` against HTTP intake logs |
| **Duplicate replies / replay** | Check for duplicate `traceId` in `update.received` events |
| **Concurrent state overwrites** | Search logs for `event: "session.conflict"` |
| **Redis latency spike** | AI/LLM span `ai_generation` duration — or Redis EVALSHA latency in infrastructure metrics |
| **Lost trace correlation** | Scan logs for blank or default `traceId` in async paths |
| **AI/LLM timeout or cost spike** | `llm.usage.prompt_tokens` + `llm.usage.completion_tokens` in span attributes |

---

## 📦 Installation

```bash
pnpm add @tgwrapper/observability
```

---

## 📈 Maturity & Support Level
- **Stability:** `Beta`
- **Adoption Status:** Used in early developer testing environments.
- **Runtime Support:** Node.js is primary. Serverless and edge usage is partial and exporter-dependent.
- **API Stability:** `Evolving` (Trace context structures might experience minor refinements prior to 1.0).

See [Observability Runtime Support](../../docs/OBSERVABILITY_RUNTIME_SUPPORT.md) and [Observability Stability Contract](../../docs/OBSERVABILITY_STABILITY_CONTRACT.md) for the canonical runtime and stability breakdown.

---

## 🚀 Quick Start

```typescript
import { createBotClient } from '@tgwrapper/core';
import { attachBotObservability, MetricsRegistry } from '@tgwrapper/observability';

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'polling' });
const registry = new MetricsRegistry();

// Bind loggers and metrics
const detach = attachBotObservability(bot, {
  metrics: registry,
  logger: { log: (evt) => console.log(JSON.stringify(evt)) },
  serviceName: 'bot-service'
});
```

---

## 🛠️ Telemetry & Export Recipes

### Recipe 1: Prometheus Export
Expose bot metrics to Prometheus scrapers:
```typescript
import { PrometheusExporter } from '@tgwrapper/observability';
import { createServer } from 'http';

const exporter = new PrometheusExporter(registry);
createServer((req, res) => {
  if (req.url === '/metrics') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(exporter.export());
  }
}).listen(8080);
```

### Recipe 2: AI / LLM Call Tracing
Track conversational request spans and token metrics:
```typescript
import { Tracer } from '@tgwrapper/observability';

const tracer = new Tracer();
async function handleQuery(prompt: string) {
  return await tracer.withSpan('ai_generation', async () => {
    const span = tracer.startSpan('llm_call');
    const res = await callLLM(prompt);
    
    // Log token usage metrics
    span.attributes['llm.usage.prompt_tokens'] = res.promptTokens;
    span.attributes['llm.usage.completion_tokens'] = res.completionTokens;
    
    tracer.endSpan(span, 'ok');
    return res.text;
  });
}
```

---

## 🛰️ What You Get Out Of The Box (Telemetry Map)

Once attached, the engine captures and propagates structured telemetry across the entire update lifecycle:

* **Structured JSON Logs & Events:** High-fidelity lifecycle markers (`bot.start`, `update.received`, `update.processed`, `update.error`, `session.conflict`) printed to standard output.
* **In-Process Metrics (`MetricsRegistry`):** Real-time monotonic counters for total traffic volume, error ratios, rate-limiter rejections, and execution latency.
* **Trace Context Propagation:** Wraps Telegram update execution in a Node.js `AsyncLocalStorage` boundary, generating a unique `traceId` correlation token. Non-Node runtimes may provide degraded propagation.
* **OTEL Span Conversion:** Ready-to-export spans through the integrated OpenTelemetry bridge.
* **AI/LLM Tracing Hooks:** Pre-built functions to trace third-party LLM response latencies and prompt/completion token budgets within the active update's trace chain.

---

## 🛠️ Incident-Driven Debugging Cookbook

Here is how to isolate typical production failures using the telemetry output:

| Target Incident Scenario | Telemetry Signal to Query | Resolution Strategy |
| :--- | :--- | :--- |
| **Bot is slow/sluggish** | Check `update_duration_ms_sum / update_duration_ms_count` to measure average duration. Grep for `update.processed` logs where `durationMs > 1000`. | Profile downstream database queries or API fetching latency. |
| **Missing Telegram updates** | Cross-reference `updates_received_total` metric count against your HTTP endpoint intake access logs. | Isolate whether updates are dropping before ingestion or failing in early filters. |
| **Concurrent state overwrites** | Search logs for `event: "session.conflict"` occurrences. | Implement an exponential backoff-retry loop on the failing `compareAndSet` calls. |
| **LLM latency / token spikes** | Extract nested span measurements generated via the AI tracing utilities, filtered by span name `ai_generation`. | Optimize prompt templates or configure model streaming modes. |
| **Tracing context loss** | Scan logs for blank or default `traceId` tokens within asynchronous execution paths. | Ensure database calls and callback handlers remain within the `AsyncLocalStorage` call chain. |

---

## 🚀 Recommended Deployment Stacks

Ensure you match the telemetry backend configuration to your runtime infrastructure environment:

### 1. Local Development
* **Logging:** Direct JSON stdout printed to console.
* **Metrics:** Scraping the local `/metrics` endpoint (or reading `MetricsRegistry.snapshot()` directly).
* **Stack:** Single process Node.js.

### 2. High-Traffic Standalone VM / Kubernetes
* **Logging:** Forward stdout JSON to ElasticSearch, Vector, or Datadog log agents.
* **Metrics:** Expose Prometheus `/metrics` scraper using `PrometheusExporter`.
* **Stack:** Prometheus server + Grafana dashboards.

### 3. Edge / Serverless (Cloudflare Workers / AWS Lambda)
* **Telemetry Export:** Use the OTLP JSON bridge to push structured traces to an OpenTelemetry collector endpoint asynchronously before execution timeout.
* **Caveat:** Async context propagation and exporter behavior are runtime-dependent. Prefer explicit trace propagation in handlers that cross platform boundaries.

---

## 🛑 Limitations & Non-goals

Review these operational boundaries before integrating the observability package:

* **No Built-in UI Dashboard:** The package does not ship with visual graphs or web interfaces. It exports raw metrics (Prometheus format or OTLP JSON). You must set up your own Prometheus/Grafana or Datadog collectors.
* **Node.js Runtime Dependency:** Context correlation utilizes Node's standard `AsyncLocalStorage`. In serverless platforms that do not fully support AsyncLocalStorage hooks, context propagation behaves as a global fallback.
* **Memory Management:** Spans started manually via `Tracer.startSpan` must be closed manually via `Tracer.endSpan`. Failing to close spans will cause memory usage growth in long-running polling processes.
* **Non-goal: Log Aggregation Backend:** This package emits structured events to stdout. It does not ship a log forwarder, aggregator, or storage backend. Routing to ElasticSearch, Datadog, or Loki is your infrastructure responsibility.
* **Non-goal: Alerting Rules:** No alert definitions or SLO policies are bundled. Use the emitted metric names with your chosen monitoring platform to configure alerting thresholds.

---

## 🛡️ Evidence & Validation

Continuous quality gates run on every commit to validate the telemetry contract:

- **Unit Test Coverage:** Vitest suite validates span lifecycle (open/close), `AsyncLocalStorage` context isolation, `MetricsRegistry` counter accuracy, and structured log event schemas.
- **Integration Verified:** Observability hooks are exercised end-to-end in the `multi-instance-redis-starter` reference app — every update cycle emits a `[TELEMETRY]` trace line verifiable in CI logs.
- **OTEL Bridge Compatibility:** The OpenTelemetry span bridge is validated against the `@opentelemetry/sdk-node` collector to confirm exportable span structure.

### 🔬 Proof & Telemetry Validation
- **Exporter Coverage:** Compatibility validated with Prometheus (`/metrics` exporter), OTLP JSON collector format, and stdout log formats.
- **Context Integrity:** Verified context separation across concurrent execution paths using Node's `AsyncLocalStorage` under heavy mock loads.
- **Correlation Mapping:** Tests confirm correct `traceId` correlation across API boundaries, session reads, and simulated external HTTP calls.
- **Overhead Budget:** Telemetry hooks are designed to stay low-overhead. Treat exact overhead as deployment-specific unless measured with your handler workload and exporter configuration.

Verify locally:
```bash
pnpm install
pnpm build
pnpm test
```
