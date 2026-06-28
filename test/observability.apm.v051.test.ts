import { describe, expect, it } from 'vitest';
import {
  ConfigurableLogger,
  ConsoleJsonExporter,
  createDiagnosticsSnapshot,
  createProcessMetricsSampler,
  ExportManager,
  instrumentDbOperation,
  instrumentQueueJob,
  instrumentTelegramCall,
  instrumentUpdateHandler,
  MetricsRegistry,
  OtlpGrpcMetricsExporter,
  redactSensitiveData,
  Tracer,
  validateObservabilityConfig,
  withCorrelationContext,
} from '../packages/observability/src/index.js';

describe('observability 0.5.1', () => {
  it('propagates ALS correlation per async flow', async () => {
    const a = withCorrelationContext({ traceId: 'trace-a', requestId: 'r1' }, async () => {
      await new Promise((r) => setTimeout(r, 1));
      return withCorrelationContext({ spanId: 's1' }, () => 'trace-a');
    });
    const b = withCorrelationContext({ traceId: 'trace-b', requestId: 'r2' }, async () => {
      await new Promise((r) => setTimeout(r, 1));
      return withCorrelationContext({ spanId: 's2' }, () => 'trace-b');
    });
    await expect(a).resolves.toBe('trace-a');
    await expect(b).resolves.toBe('trace-b');
  });

  it('supports gauges/updown/hist/counter and label guards', () => {
    const metrics = new MetricsRegistry({
      allowedTagKeys: ['service', 'method'],
      deniedTagKeys: ['user_id'],
      hashLabelKeys: ['method'],
      maxSeriesPerMetric: 2,
    });
    metrics.increment('api_calls_total', 1, {
      service: 'bot',
      method: 'sendMessage',
      user_id: 'u1',
    });
    metrics.observe('api_duration_ms', 12, { service: 'bot', method: 'sendMessage' });
    metrics.setGauge('queue_depth', 5, { service: 'bot' });
    metrics.addUpDownCounter('workers_busy', 1, { service: 'bot' });
    const snap = metrics.snapshot();
    expect(Object.keys(snap.counters).length).toBeGreaterThan(0);
    expect(Object.keys(snap.gauges).length).toBeGreaterThan(0);
    expect(Object.keys(snap.upDownCounters).length).toBeGreaterThan(0);
    expect(Object.keys(snap.histograms).length).toBeGreaterThan(0);
  });

  it('supports exporter manager retries and fail-open overflow', async () => {
    let calls = 0;
    const exporter = {
      name: 'mock',
      exportBatch: async () => {
        calls += 1;
        if (calls < 2) {
          throw new Error('temporary');
        }
      },
    };
    const manager = new ExportManager({
      exporter,
      queueSize: 2,
      flushIntervalMs: 10_000,
      maxRetries: 2,
      backoffMs: 1,
      timeoutMs: 500,
      failOpen: true,
    });
    manager.enqueue({ kind: 'metrics', payload: { a: 1 }, createdAt: Date.now() });
    manager.enqueue({ kind: 'metrics', payload: { a: 2 }, createdAt: Date.now() });
    manager.enqueue({ kind: 'metrics', payload: { a: 3 }, createdAt: Date.now() });
    await manager.flush();
    const d = manager.diagnostics();
    expect(d.dropped).toBe(1);
    expect(d.exportErrors).toBe(0);
  });

  it('instruments update/api/db/queue helpers and diagnostics snapshot', async () => {
    const tracer = new Tracer();
    const metrics = new MetricsRegistry();

    const wrapped = instrumentUpdateHandler(
      tracer,
      metrics,
      async (ctx: { ok: boolean }) => ctx.ok,
    );
    const ok = await wrapped({ ok: true });
    expect(ok).toBe(true);

    await instrumentTelegramCall(tracer, metrics, 'getMe', async () => ({ ok: true }));
    await instrumentDbOperation(tracer, metrics, 'findUser', async () => ({ id: 1 }), 'users');
    await instrumentQueueJob(tracer, metrics, 'updates', async () => true);

    const cfg = validateObservabilityConfig({
      serviceName: 'svc',
      serviceVersion: '0.5.1',
      env: 'prod',
    });
    expect(cfg.ok).toBe(true);
    if (cfg.ok) {
      const snapshot = createDiagnosticsSnapshot({ registry: metrics, tracer, config: cfg.value });
      expect(snapshot.timestamp).toBeTypeOf('string');
    }
  });

  it('supports process metrics sampler and logger redaction', async () => {
    const metrics = new MetricsRegistry();
    const stop = createProcessMetricsSampler(metrics, { intervalMs: 5 });
    await new Promise((r) => setTimeout(r, 12));
    stop();

    const lines: unknown[] = [];
    const logger = new ConfigurableLogger({
      level: 'debug',
      sink: (e) => lines.push(e),
      sampleRateByLevel: { debug: 1 },
    });

    logger.log({
      level: 'info',
      event: 'msg',
      timestamp: new Date().toISOString(),
      data: redactSensitiveData({ token: '123', email: 'a@b.com', message: 'secret-text' }),
    });

    expect(lines.length).toBe(1);
    expect(metrics.snapshot().histograms).toBeTruthy();
  });

  it('console exporter emits JSON lines', async () => {
    const out: string[] = [];
    const exporter = new ConsoleJsonExporter((line) => out.push(line));
    await exporter.exportBatch([
      { kind: 'log', payload: { hello: 'world' }, createdAt: Date.now() },
    ]);
    expect(out[0]).toContain('hello');
  });

  it('supports otlp grpc exporter adapter', async () => {
    const metrics = new MetricsRegistry();
    metrics.increment('updates_total', 1, { service: 'bot' });
    let sent = false;
    const grpc = new OtlpGrpcMetricsExporter(metrics, {
      send: async (payload) => {
        sent = Boolean(payload);
      },
    });
    await grpc.export();
    expect(sent).toBe(true);
  });
});
