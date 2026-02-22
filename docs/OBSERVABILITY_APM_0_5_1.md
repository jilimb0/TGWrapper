# Observability APM 0.5.1

## Quickstart (10 minutes)

```ts
import {
  MetricsRegistry,
  Tracer,
  ConfigurableLogger,
  ExportManager,
  OtlpMetricsExporter
} from '@jilimb0/tgwrapper-observability';

const metrics = new MetricsRegistry({ sampleRate: 1, maxSeriesPerMetric: 500 });
const tracer = new Tracer();
const logger = new ConfigurableLogger({ level: 'info' });

const otlp = new OtlpMetricsExporter(metrics, {
  endpoint: process.env.OTLP_HTTP_ENDPOINT!
});

const exporter = new ExportManager({
  exporter: {
    name: 'otlp',
    exportBatch: async () => {
      await otlp.export();
    }
  },
  queueSize: 2000,
  flushIntervalMs: 5000,
  timeoutMs: 2000,
  failOpen: true
});

exporter.start();
exporter.setupSignalHandlers();
```

## Production Configs

### OTLP HTTP

```ts
validateObservabilityConfig({
  enabled: true,
  serviceName: 'my-bot',
  serviceVersion: '0.5.1',
  env: 'prod',
  sampleRate: 0.2,
  exporter: 'otlp-http',
  endpoint: 'https://otel-collector.example/v1/metrics',
  flushIntervalMs: 5000,
  queueSize: 5000
});
```

### Prometheus Scrape

Use `createPrometheusScrapeHandler(registry)` and expose via `/metrics`.

### Local/Dev

Use `ConsoleJsonExporter` with `ConfigurableLogger(level=debug)`.

## Naming Conventions

- Counters: `_total`
- Durations: `_duration_ms`
- Queues: `queue_*`
- Errors: `errors_total` with `source` label

Recommended labels allowlist:

- `service`
- `env`
- `method`
- `operation`
- `update_type`
- `queue`

## Alerting Recipes

- `errors_total` rate > 1% over 5m
- `api_duration_ms` p95 > 800ms over 10m
- dropped telemetry (`droppedMetrics`) > 0 for 5m
- exporter errors > 0 for 5m
- exporter queue depth > 80% capacity

## Migration (0.x -> 0.5.1)

- Replace direct `InMemoryMetrics` usage with `MetricsRegistry` where possible.
- Add `Tracer` and wrap critical handlers with `instrumentUpdateHandler`.
- Add exporter pipeline (`ExportManager`) and graceful shutdown hooks.
- Switch logger to `ConfigurableLogger` for level control, sampling, and redaction.
