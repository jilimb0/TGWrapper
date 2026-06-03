# @jilimb0/tgwrapper-observability

> A low-overhead telemetry engine for TGWrapper providing metrics registries, log formatting, and trace correlation mappings.

## 📦 Installation

```bash
pnpm add @jilimb0/tgwrapper-observability
```

---

## 📈 Maturity & Support Level
- **Stability:** `Beta`
- **Adoption Status:** Used in early developer testing environments.
- **Runtime Support:** Node.js (relies on standard `AsyncLocalStorage` hooks).
- **API Stability:** `Evolving` (Trace context structures might experience minor refinements prior to 1.0).

---

## 🚀 Quick Start

```typescript
import { createBotClient } from '@jilimb0/tgwrapper';
import { attachBotObservability, MetricsRegistry } from '@jilimb0/tgwrapper-observability';

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
import { PrometheusExporter } from '@jilimb0/tgwrapper-observability';
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
import { Tracer } from '@jilimb0/tgwrapper-observability';

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

## 🛑 Limitations & Caveats

Review these operational boundaries before integrating the observability package:

* **No Built-in UI Dashboard:** The package does not ship with visual graphs or web interfaces. It exports raw metrics (Prometheus format or OTLP JSON). You must set up your own Prometheus/Grafana or Datadog collectors.
* **Node.js Runtime Dependency:** Context correlation utilizes Node's standard `AsyncLocalStorage`. In serverless platforms that do not fully support AsyncLocalStorage hooks, context propagation behaves as a global fallback.
* **Memory Management:** Spans started manually via `Tracer.startSpan` must be closed manually via `Tracer.endSpan`. Failing to close spans will cause memory usage growth in long-running polling processes.
