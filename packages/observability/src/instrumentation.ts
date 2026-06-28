import { performance } from 'node:perf_hooks';
import type {
  AttachBotObservabilityOptions,
  JsonObject,
  JsonValue,
  Logger,
  LogLevel,
  MetricsCollector,
  ObservabilityConfig,
  ObservabilityHealth,
  ObservableBot,
  RuntimeEventHookMap,
  RuntimeHookHandlers,
  RuntimeHookTarget,
} from './types.js';
import { Tracer } from './tracer.js';
import { classifyError } from './errors.js';
import { MetricsRegistry } from './metrics.js';
import type { ExportManager } from './export-manager.js';

export function instrumentUpdateHandler<TContext, TResult>(
  tracer: Tracer,
  metrics: MetricsCollector,
  fn: (ctx: TContext) => Promise<TResult>,
  attrs: Record<string, string | number | boolean> = {},
): (ctx: TContext) => Promise<TResult> {
  return async (ctx) => {
    const started = Date.now();
    return tracer.withSpan(
      'update.handler',
      async () => {
        try {
          const result = await fn(ctx);
          metrics.increment('updates_total');
          metrics.observe('update_duration_ms', Date.now() - started);
          return result;
        } catch (error) {
          metrics.increment('errors_total', 1, { source: 'update' });
          throw error;
        }
      },
      { component: 'handler', operation: 'update', ...attrs },
    );
  };
}

export async function instrumentTelegramCall<TResult>(
  tracer: Tracer,
  metrics: MetricsCollector,
  method: string,
  fn: () => Promise<TResult>,
): Promise<TResult> {
  const started = Date.now();
  return tracer.withSpan(
    `telegram.${method}`,
    async () => {
      try {
        const result = await fn();
        metrics.increment('api_calls_total', 1, { method });
        metrics.observe('api_duration_ms', Date.now() - started, { method });
        return result;
      } catch (error) {
        metrics.increment('errors_total', 1, { source: 'api', method });
        throw error;
      }
    },
    { component: 'telegram', operation: 'api_call', 'telegram.method': method },
  );
}

export async function instrumentDbOperation<TResult>(
  tracer: Tracer,
  metrics: MetricsCollector,
  operation: string,
  fn: () => Promise<TResult>,
  table?: string,
): Promise<TResult> {
  const started = Date.now();
  return tracer.withSpan(
    `db.${operation}`,
    async () => {
      try {
        const result = await fn();
        metrics.increment('db_queries_total', 1, { operation });
        metrics.observe('db_duration_ms', Date.now() - started, { operation });
        return result;
      } catch (error) {
        metrics.increment('errors_total', 1, { source: 'db', operation });
        throw error;
      }
    },
    { component: 'db', operation, ...(table ? { 'db.table': table } : {}) },
  );
}

export async function instrumentQueueJob<TResult>(
  tracer: Tracer,
  metrics: MetricsCollector,
  queueName: string,
  fn: () => Promise<TResult>,
): Promise<TResult> {
  const started = Date.now();
  return tracer.withSpan(
    `queue.${queueName}`,
    async () => {
      try {
        const result = await fn();
        metrics.increment('queue_jobs_total', 1, { queue: queueName });
        metrics.observe('queue_duration_ms', Date.now() - started, { queue: queueName });
        return result;
      } catch (error) {
        metrics.increment('errors_total', 1, { source: 'queue', queue: queueName });
        throw error;
      }
    },
    { component: 'queue', operation: 'job', 'queue.name': queueName },
  );
}

export async function instrumentScheduledTask<TResult>(
  tracer: Tracer,
  metrics: MetricsCollector,
  taskName: string,
  fn: () => Promise<TResult>,
): Promise<TResult> {
  const started = Date.now();
  return tracer.withSpan(
    `scheduler.${taskName}`,
    async () => {
      try {
        const result = await fn();
        metrics.increment('scheduler_jobs_total', 1, { task: taskName });
        metrics.observe('scheduler_duration_ms', Date.now() - started, { task: taskName });
        return result;
      } catch (error) {
        metrics.increment('errors_total', 1, { source: 'scheduler', task: taskName });
        throw error;
      }
    },
    { component: 'scheduler', operation: 'task' },
  );
}

export function createDiagnosticsSnapshot(params: {
  registry: MetricsRegistry;
  tracer: Tracer;
  exportManager?: ExportManager;
  config: ObservabilityConfig;
}): JsonObject {
  const health = params.registry.health();
  const trace = params.tracer.snapshot();
  const exporter = params.exportManager?.diagnostics();
  return {
    timestamp: new Date().toISOString(),
    config: {
      serviceName: params.config.serviceName,
      serviceVersion: params.config.serviceVersion,
      env: params.config.env,
      enabled: params.config.enabled,
    } as unknown as JsonValue,
    health: health as unknown as JsonValue,
    trace: trace as unknown as JsonValue,
    exporter: (exporter ?? {}) as unknown as JsonValue,
  };
}

export function createProcessMetricsSampler(
  registry: MetricsCollector,
  options: { intervalMs?: number } = {},
): () => void {
  const intervalMs = options.intervalMs ?? 5_000;
  let last = performance.now();
  const timer = setInterval(() => {
    const now = performance.now();
    const lag = Math.max(0, now - last - intervalMs);
    last = now;

    const mem = process.memoryUsage();
    registry.setGauge?.('process_rss_bytes', mem.rss);
    registry.setGauge?.('process_heap_used_bytes', mem.heapUsed);
    registry.observe('process_event_loop_lag_ms', lag);
    registry.setGauge?.(
      'process_active_handles',
      typeof (process as unknown as { _getActiveHandles?: () => unknown[] })._getActiveHandles ===
        'function'
        ? (process as unknown as { _getActiveHandles: () => unknown[] })._getActiveHandles().length
        : 0,
    );
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}

export function attachBotObservability(
  target: ObservableBot,
  options: AttachBotObservabilityOptions,
): () => void {
  const unsubscribers: Array<() => void> = [];
  const log = (level: LogLevel, event: string, data?: JsonObject): void => {
    if (!options.logger) {
      return;
    }
    const redacted = options.redact ? options.redact(data) : data;
    options.logger.log({
      level,
      event,
      timestamp: new Date().toISOString(),
      data: {
        service: options.serviceName,
        tenant_id: options.tenantId,
        bot_id: options.botId,
        ...(redacted ?? {}),
      },
    });
  };

  options.metrics.increment('bot_launch_total', 1, {
    service: options.serviceName,
  });
  log('info', 'bot_launch');

  const unsubscribeError = target.onError((error) => {
    const classified = classifyError(error, 'runtime');
    options.metrics.increment('bot_runtime_error_total', 1, {
      service: options.serviceName,
      class: classified.class,
      code: classified.code,
    });
    log('error', 'bot_runtime_error', {
      message: classified.message,
      class: classified.class,
      code: classified.code,
    });
  });
  unsubscribers.push(unsubscribeError);

  unsubscribers.push(
    target.on('update', (payload) => {
      const update = payload as Record<string, unknown>;
      const updateType =
        Object.keys(update).find((key) => key !== 'update_id' && update[key] !== undefined) ??
        'unknown';
      options.metrics.increment('bot_update_total', 1, {
        service: options.serviceName,
        update_type: updateType,
      });
    }),
  );
  unsubscribers.push(
    target.on('api_call', (payload) => {
      const method = (payload as { method?: string }).method ?? 'unknown';
      options.metrics.increment('bot_api_call_total', 1, {
        service: options.serviceName,
        method,
      });
    }),
  );
  unsubscribers.push(
    target.on('api_result', (payload) => {
      const event = payload as { method?: string; durationMs?: number };
      const method = event.method ?? 'unknown';
      options.metrics.observe('bot_api_latency_ms', event.durationMs ?? 0, {
        service: options.serviceName,
        method,
      });
    }),
  );
  unsubscribers.push(
    target.on('api_error', (payload) => {
      const event = payload as { method?: string; error?: unknown; retrying?: boolean };
      const method = event.method ?? 'unknown';
      const classified = classifyError(event.error, 'api');
      options.metrics.increment('bot_api_error_total', 1, {
        service: options.serviceName,
        method,
        class: classified.class,
        code: classified.code,
        retrying: event.retrying ? 'true' : 'false',
      });
    }),
  );
  unsubscribers.push(
    target.on('queue_event', (payload) => {
      const event = payload as {
        queue?: string;
        action?: 'enqueue' | 'dequeue' | 'drop';
        durationMs?: number;
      };
      const queue = event.queue ?? 'default';
      const action = event.action ?? 'enqueue';
      options.metrics.increment('queue_events_total', 1, {
        service: options.serviceName,
        queue,
        action,
      });
      if (event.durationMs !== undefined) {
        options.metrics.observe('queue_latency_ms', event.durationMs, {
          service: options.serviceName,
          queue,
          action,
        });
      }
    }),
  );
  unsubscribers.push(
    target.on('db_event', (payload) => {
      const event = payload as { operation?: string; durationMs?: number; error?: unknown };
      const operation = event.operation ?? 'unknown';
      const classified = event.error ? classifyError(event.error, 'db') : undefined;
      options.metrics.increment('db_events_total', 1, {
        service: options.serviceName,
        operation,
        status: event.error ? 'error' : 'ok',
        ...(classified ? { class: classified.class } : {}),
      });
      if (event.durationMs !== undefined) {
        options.metrics.observe('db_latency_ms', event.durationMs, {
          service: options.serviceName,
          operation,
        });
      }
    }),
  );

  return () => {
    for (const unsubscribe of unsubscribers) {
      unsubscribe();
    }
    options.metrics.increment('bot_shutdown_total', 1, {
      service: options.serviceName,
    });
    log('info', 'bot_shutdown');
  };
}

export function getObservabilityHealth(registry: MetricsRegistry): ObservabilityHealth {
  return registry.health();
}

export async function trackAsync<T>(
  metrics: MetricsCollector,
  metricName: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>,
): Promise<T> {
  const started = Date.now();
  try {
    const result = await fn();
    metrics.observe(metricName, Date.now() - started, tags);
    return result;
  } catch (error: unknown) {
    metrics.observe(metricName, Date.now() - started, {
      ...(tags ?? {}),
      status: 'error',
    });
    throw error;
  }
}

export function createTimer(
  metrics: MetricsCollector,
  metricName: string,
  tags?: Record<string, string>,
): () => void {
  const started = Date.now();
  return () => {
    metrics.observe(metricName, Date.now() - started, tags);
  };
}

export function bindRuntimeObservability(
  target: RuntimeHookTarget,
  handlers: RuntimeHookHandlers,
): () => void {
  const unsubscribeError = target.onError(async (error) => {
    handlers.onError?.({ error });
  });

  return () => {
    unsubscribeError();
  };
}

export function createRuntimeObservabilityHooks(options: {
  metrics: MetricsCollector;
  logger?: Logger;
  serviceName: string;
}): RuntimeEventHookMap {
  return {
    onBotUpdate: ({ updateType, tenantKey }) => {
      options.metrics.increment('bot_update_total', 1, {
        service: options.serviceName,
        update_type: updateType,
        ...(tenantKey ? { tenant: tenantKey } : {}),
      });
    },
    onRuntimeError: ({ error }) => {
      const classified = classifyError(error, 'runtime');
      options.metrics.increment('bot_runtime_error_total', 1, {
        service: options.serviceName,
        class: classified.class,
        code: classified.code,
      });
    },
    onApiCall: ({ method }) => {
      options.metrics.increment('bot_api_call_total', 1, {
        service: options.serviceName,
        method,
      });
    },
    onApiResult: ({ method, durationMs }) => {
      options.metrics.observe('bot_api_latency_ms', durationMs, {
        service: options.serviceName,
        method,
      });
    },
    onApiError: ({ method, error, retrying }) => {
      const classified = classifyError(error, 'api');
      options.metrics.increment('bot_api_error_total', 1, {
        service: options.serviceName,
        method,
        class: classified.class,
        retrying: retrying ? 'true' : 'false',
      });
    },
    onQueueEvent: ({ queue, action, durationMs }) => {
      options.metrics.increment('queue_events_total', 1, {
        service: options.serviceName,
        queue,
        action,
      });
      if (durationMs !== undefined) {
        options.metrics.observe('queue_latency_ms', durationMs, {
          service: options.serviceName,
          queue,
          action,
        });
      }
    },
    onDbEvent: ({ operation, durationMs, error }) => {
      options.metrics.increment('db_events_total', 1, {
        service: options.serviceName,
        operation,
        status: error ? 'error' : 'ok',
      });
      if (durationMs !== undefined) {
        options.metrics.observe('db_latency_ms', durationMs, {
          service: options.serviceName,
          operation,
        });
      }
    },
  };
}

export function validateObservabilityConfig(
  input: Partial<ObservabilityConfig>,
): { ok: true; value: ObservabilityConfig } | { ok: false; issues: string[] } {
  const issues: string[] = [];
  const valueBase = {
    enabled: input.enabled ?? true,
    serviceName: input.serviceName ?? 'bot-service',
    serviceVersion: input.serviceVersion ?? '0.0.0',
    env: input.env ?? 'prod',
    sampleRate: input.sampleRate ?? 1,
    exporter: input.exporter ?? 'console',
    headers: input.headers ?? {},
    flushIntervalMs: input.flushIntervalMs ?? 5_000,
    queueSize: input.queueSize ?? 2_000,
    featureFlags: input.featureFlags ?? { tracing: true, metrics: true, logs: true, export: true },
    logLevel: input.logLevel ?? 'info',
  } satisfies Omit<ObservabilityConfig, 'endpoint' | 'timeoutMs'>;
  const value: ObservabilityConfig = {
    ...valueBase,
    ...(input.endpoint ? { endpoint: input.endpoint } : {}),
    ...(input.timeoutMs !== undefined ? { timeoutMs: input.timeoutMs } : { timeoutMs: 2_000 }),
  };

  if (value.sampleRate < 0 || value.sampleRate > 1) {
    issues.push('sampleRate must be between 0 and 1');
  }
  if (value.flushIntervalMs < 100) {
    issues.push('flushIntervalMs must be >= 100');
  }
  if (value.queueSize < 10) {
    issues.push('queueSize must be >= 10');
  }
  if (value.exporter === 'otlp-http' && !value.endpoint) {
    issues.push('endpoint is required for otlp-http exporter');
  }
  if (!value.serviceName.trim()) {
    issues.push('serviceName must be non-empty');
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true, value };
}
