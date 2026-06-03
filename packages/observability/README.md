# @jilimb0/tgwrapper-observability

> Core telemetry engine for TGWrapper. Instrument your bot runtime with zero-overhead logging, Prometheus metrics, and AsyncLocalStorage trace correlation.

## 📦 Installation

```bash
pnpm add @jilimb0/tgwrapper-observability
```

---

## 🚀 Quick Start

Attach telemetry tracking to any TGWrapper client in one call:

```typescript
import { createBotClient } from '@jilimb0/tgwrapper';
import { attachBotObservability, MetricsRegistry } from '@jilimb0/tgwrapper-observability';

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'polling' });
const registry = new MetricsRegistry();

// Bind metrics and logging to bot events
const detach = attachBotObservability(bot, {
  metrics: registry,
  logger: {
    log: (evt) => console.log(JSON.stringify(evt))
  },
  serviceName: 'my-bot-service',
  tenantId: 'tenant-1',
  botId: 'production-bot-01'
});

await bot.start();
```

---

## 📊 Telemetry Model & Instrumented Metrics

`attachBotObservability` automatically tracks bot execution status.

### Collected Metrics
- `bot_launch_total` (Counter): Logs bot bootstrap events.
- `bot_update_total` (Counter, labels: `update_type`): Tracks update types ingested (e.g., `message`, `callback_query`).
- `bot_runtime_error_total` (Counter, labels: `class`, `code`): Classified runtime errors (e.g., `db`, `api`, `transport`).

---

## 🔗 Correlation Trace Context

Observing webhooks and external APIs requires trace correlation. TGWrapper-observability uses Node.js `AsyncLocalStorage` to tie log events to specific incoming updates or users:

```typescript
import { withCorrelationContext, getCorrelationContext } from '@jilimb0/tgwrapper-observability';

// Inject context in update handler
export async function handleUpdate(update: any) {
  const context = {
    traceId: update.update_id.toString(),
    userId: update.message?.from?.id?.toString(),
    chatId: update.message?.chat?.id?.toString()
  };

  await withCorrelationContext(context, async () => {
    // Any downstream functions can fetch active trace IDs automatically
    const current = getCorrelationContext();
    console.log(`Executing within context of trace: ${current.traceId}`);
  });
}
```

---

## 🛠️ Production Recipes

### Recipe 1: ECS-Compliant Structured Logging (JSON)
Perfect for Datadog, ELK, or AWS CloudWatch processing.

```typescript
import { Logger, LogEvent } from '@jilimb0/tgwrapper-observability';

class EcsLogger implements Logger {
  public log(event: LogEvent): void {
    console.log(JSON.stringify({
      '@timestamp': event.timestamp,
      'log.level': event.level.toUpperCase(),
      'event.action': event.event,
      'tg.request_id': event.requestId,
      ...event.data
    }));
  }
}
```

---

### Recipe 2: Prometheus Metrics & Dashboard Export
Expose metrics to Prometheus scrapers using standard formatting:

```typescript
import { MetricsRegistry, PrometheusExporter } from '@jilimb0/tgwrapper-observability';
import { createServer } from 'http';

const registry = new MetricsRegistry();
const exporter = new PrometheusExporter(registry);

createServer((req, res) => {
  if (req.url === '/metrics') {
    res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
    res.end(exporter.export());
  } else {
    res.writeHead(404).end();
  }
}).listen(8080);
```

---

### Recipe 3: AI-Telemetry Trace Flow (LLM, Spans, and Tokens)
Correlate external model spans with incoming Telegram events, tracking token accounting details.

```typescript
import { Tracer } from '@jilimb0/tgwrapper-observability';

const tracer = new Tracer();

async function handleAIBotQuery(userPrompt: string) {
  // Trace the overall AI session
  return await tracer.withSpan('ai_generation', async () => {
    
    // Sub-span tracking model response time and token metrics
    const modelSpan = tracer.startSpan('llm_call', { provider: 'openai', model: 'gpt-4o' });
    try {
      const response = await callLLMApi(userPrompt);
      
      // Inject token usage accounting
      modelSpan.attributes['llm.usage.prompt_tokens'] = response.promptTokens;
      modelSpan.attributes['llm.usage.completion_tokens'] = response.completionTokens;
      
      tracer.endSpan(modelSpan, 'ok');
      return response.text;
    } catch (err) {
      tracer.endSpan(modelSpan, 'error');
      throw err;
    }
  }, { user_prompt_length: userPrompt.length });
}

async function callLLMApi(prompt: string) {
  // Simulated LLM return payload
  return {
    text: "AI Response content.",
    promptTokens: 15,
    completionTokens: 25
  };
}
```
