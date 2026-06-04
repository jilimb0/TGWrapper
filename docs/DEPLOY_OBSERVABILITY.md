# Deployment Recipes: Observability Stacks

This guide provides deployment integration recipes for the `@jilimb0/tgwrapper-observability` package across three common infrastructure environments.

---

## 🛠️ Stack Selection Summary

| Target Environment | Logger Target | Metrics Export | Tracing Export | Recommended Stack |
| :--- | :--- | :--- | :--- | :--- |
| **Local Development** | Console (stdout) | Memory Snapshot | No-op / In-Memory | JSON stdout + console inspector |
| **Prometheus Stack** | Fluentbit / Vector | `/metrics` scraping | Jaeger / Tempo OTLP | Prometheus + Grafana |
| **Edge / Serverless** | CloudWatch / CF Logs | OTLP HTTP Push | OTLP JSON Collector | OpenTelemetry Collector |

---

## 1. Local Development (Low Overhead Setup)

Designed for rapid iteration without spinning up extra monitoring servers.

```typescript
import { createBotClient } from '@jilimb0/tgwrapper';
import { attachBotObservability, MetricsRegistry } from '@jilimb0/tgwrapper-observability';

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'polling' });
const registry = new MetricsRegistry();

// Direct stdout event logging
attachBotObservability(bot, {
  metrics: registry,
  logger: {
    log: (evt) => console.log(`[TELEMETRY] ${evt.event} (${evt.durationMs ?? 0}ms)`)
  },
  serviceName: 'bot-dev'
});
```

---

## 2. Production Prometheus + Grafana Setup

Configures a scraping endpoint to serve Prometheus counters.

```typescript
import { createBotClient } from '@jilimb0/tgwrapper';
import { attachBotObservability, MetricsRegistry, PrometheusExporter } from '@jilimb0/tgwrapper-observability';
import { createServer } from 'http';

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'polling' });
const registry = new MetricsRegistry();
const exporter = new PrometheusExporter(registry);

attachBotObservability(bot, {
  metrics: registry,
  serviceName: 'bot-production'
});

// Serve scraping endpoint on port 8080
createServer((req, res) => {
  if (req.url === '/metrics') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(exporter.export());
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(8080);
```

### Example Prometheus Configuration Block
```yaml
scrape_configs:
  - job_name: 'telegram-bot'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:8080']
```

---

## 3. Ephemeral Edge / Serverless Push Setup (OTLP)

Edge/serverless environments (AWS Lambda, Cloudflare Workers) require pushing metrics and traces via HTTP POST to an OpenTelemetry collector before the execution context is destroyed.

```typescript
import { createBotClient } from '@jilimb0/tgwrapper';
import { attachBotObservability, OtlpHttpTraceExporter } from '@jilimb0/tgwrapper-observability';

export default {
  async fetch(request, env, ctx) {
    const exporter = new OtlpHttpTraceExporter({
      url: env.OTLP_COLLECTOR_URL,
      headers: { 'Authorization': `Bearer ${env.OTLP_AUTH_TOKEN}` }
    });

    const bot = createBotClient({ token: env.BOT_TOKEN, mode: 'webhook' });

    attachBotObservability(bot, {
      exporter: exporter,
      serviceName: 'bot-edge-cf'
    });

    // Ensure edge runtime waits for asynchronous trace shipping post execution
    const response = await bot.handleWebhookRequest(request);
    ctx.waitUntil(exporter.flush()); 
    
    return response;
  }
};
```
