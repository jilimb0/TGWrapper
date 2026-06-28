import { describe, expect, it } from 'vitest';
import {
  attachBotObservability,
  classifyError,
  createRuntimeObservabilityHooks,
  EcsJsonLogger,
  getObservabilityHealth,
  InMemoryMetrics,
  MetricsRegistry,
  renderPrometheusMetrics,
  Tracer,
  withCorrelationContext,
} from '../packages/observability/src/index.js';

describe('observability apm features', () => {
  it('supports trace spans and correlation context', async () => {
    const tracer = new Tracer();
    const span = tracer.startSpan('work');
    expect(span.traceId).toBeTruthy();
    const finished = tracer.endSpan(span, 'ok');
    expect(finished.endTime).toBeTypeOf('number');

    const nested = await tracer.withSpan('nested', async () => {
      return withCorrelationContext({ requestId: 'req-1' }, () => tracer.snapshot().activeSpans);
    });
    expect(nested).toBeGreaterThanOrEqual(1);
  });

  it('supports prometheus export and metrics health', () => {
    const metrics = new MetricsRegistry({ sampleRate: 1, maxSeriesPerMetric: 100 });
    metrics.increment('bot_update_total', 1, { update_type: 'message' });
    metrics.observe('bot_api_latency_ms', 42, { method: 'sendMessage' });

    const text = renderPrometheusMetrics(metrics.snapshot());
    expect(text).toContain('bot_update_total');
    expect(text).toContain('bot_api_latency_ms_bucket');

    const health = getObservabilityHealth(metrics);
    expect(health.status).toBe('ok');
  });

  it('classifies errors and attaches bot observability', async () => {
    const metrics = new InMemoryMetrics();
    const logs: string[] = [];
    const logger = new EcsJsonLogger(
      { serviceName: 'test-bot' },
      { write: (line) => logs.push(line) },
    );

    const handlers = new Map<string, (payload: unknown) => void>();
    const target = {
      on: (event: string, handler: (payload: unknown) => void) => {
        handlers.set(event, handler);
        return () => handlers.delete(event);
      },
      onError: (handler: (error: unknown) => void) => {
        handlers.set('error', handler as unknown as (payload: unknown) => void);
        return () => handlers.delete('error');
      },
    };

    const detach = attachBotObservability(target, {
      metrics,
      logger,
      serviceName: 'test-bot',
    });

    handlers.get('update')?.({ update_id: 1, message: { text: 'x' } });
    handlers.get('api_call')?.({ method: 'sendMessage' });
    handlers.get('api_result')?.({ method: 'sendMessage', durationMs: 20 });
    handlers.get('queue_event')?.({ queue: 'updates', action: 'enqueue', durationMs: 3 });
    handlers.get('db_event')?.({ operation: 'redis_get', durationMs: 2 });
    handlers.get('error')?.(Object.assign(new Error('db down'), { code: 'DB_DOWN' }));

    detach();

    expect(metrics.getCounter('bot_launch_total|service=test-bot')).toBe(1);
    expect(metrics.getCounter('bot_update_total|service=test-bot,update_type=message')).toBe(1);
    expect(
      metrics.getCounter('queue_events_total|action=enqueue,queue=updates,service=test-bot'),
    ).toBe(1);
    expect(
      metrics.getCounter('db_events_total|operation=redis_get,service=test-bot,status=ok'),
    ).toBe(1);
    expect(logs.length).toBeGreaterThan(0);

    const classified = classifyError(
      Object.assign(new Error('network'), { code: 'NET_FAIL', retryable: true }),
      'api',
    );
    expect(classified.class).toBe('transport');
    expect(classified.retryable).toBe(true);
  });

  it('builds runtime hook handlers', () => {
    const metrics = new InMemoryMetrics();
    const hooks = createRuntimeObservabilityHooks({ metrics, serviceName: 'svc' });
    hooks.onApiCall?.({ method: 'getMe' });
    hooks.onApiResult?.({ method: 'getMe', durationMs: 5 });
    hooks.onDbEvent?.({ operation: 'redis_get', durationMs: 2 });

    expect(metrics.getCounter('bot_api_call_total|method=getMe,service=svc')).toBe(1);
    expect(metrics.getCounter('db_events_total|operation=redis_get,service=svc,status=ok')).toBe(1);
  });
});
