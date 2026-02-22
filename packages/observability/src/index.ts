export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue | undefined };

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEvent {
  level: LogLevel;
  event: string;
  timestamp: string;
  requestId?: string;
  data?: JsonObject;
}

export interface Logger {
  log(event: LogEvent): void;
}

export interface MetricsCollector {
  increment(metric: string, value?: number, tags?: Record<string, string>): void;
  observe(metric: string, value: number, tags?: Record<string, string>): void;
}

export interface EcsContext {
  serviceName: string;
  tenantId?: string;
  botId?: string;
}

export interface LogSink {
  write(line: string): void;
}

export interface RuntimeHookTarget {
  onError(handler: (error: unknown) => void | Promise<void>): () => void;
}

export interface RuntimeHookHandlers {
  onUpdate?: (event: { updateType: string; tenantKey: string }) => void;
  onError?: (event: { error: unknown }) => void;
  onApiCall?: (event: { method: string }) => void;
}

export interface BotLikeEventTarget {
  on?: (event: string, handler: (payload: unknown) => void | Promise<void>) => () => void;
  onError?: (handler: (error: unknown) => void | Promise<void>) => () => void;
}

export interface AttachBotObservabilityOptions {
  metrics: MetricsCollector;
  logger?: Logger;
  serviceName: string;
  tenantId?: string;
  botId?: string;
  redact?: (data: JsonObject | undefined) => JsonObject | undefined;
}

export class EcsJsonLogger implements Logger {
  private readonly context: EcsContext;
  private readonly sink: LogSink;

  public constructor(context: EcsContext, sink: LogSink) {
    this.context = context;
    this.sink = sink;
  }

  public log(event: LogEvent): void {
    const payload: Record<string, unknown> = {
      '@timestamp': event.timestamp,
      'log.level': event.level,
      message: event.event,
      'service.name': this.context.serviceName,
      'event.action': event.event,
      'labels.tenant_id': this.context.tenantId,
      'labels.bot_id': this.context.botId,
      'labels.request_id': event.requestId,
      ...this.toFlatData(event.data)
    };

    this.sink.write(JSON.stringify(this.stripUndefined(payload)));
  }

  private toFlatData(data?: JsonObject): Record<string, unknown> {
    if (!data) {
      return {};
    }

    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      out[`labels.${key}`] = value;
    }
    return out;
  }

  private stripUndefined(input: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        out[key] = value;
      }
    }
    return out;
  }
}

interface HistogramBucket {
  values: number[];
}

export interface MetricsSnapshot {
  timestamp: string;
  counters: Record<string, number>;
  histograms: Record<string, { count: number; p50: number; p95: number; min: number; max: number }>;
}

export class InMemoryMetrics implements MetricsCollector {
  private readonly counters = new Map<string, number>();
  private readonly histograms = new Map<string, HistogramBucket>();

  public increment(metric: string, value = 1, tags?: Record<string, string>): void {
    const key = this.makeKey(metric, tags);
    this.counters.set(key, (this.counters.get(key) ?? 0) + value);
  }

  public observe(metric: string, value: number, tags?: Record<string, string>): void {
    const key = this.makeKey(metric, tags);
    const bucket = this.histograms.get(key) ?? { values: [] };
    bucket.values.push(value);
    this.histograms.set(key, bucket);
  }

  public getCounter(metric: string, tags?: Record<string, string>): number {
    return this.counters.get(this.makeKey(metric, tags)) ?? 0;
  }

  public latencyP50(metric: string, tags?: Record<string, string>): number {
    return this.quantile(metric, 0.5, tags);
  }

  public latencyP95(metric: string, tags?: Record<string, string>): number {
    return this.quantile(metric, 0.95, tags);
  }

  public snapshot(): MetricsSnapshot {
    const counters: Record<string, number> = {};
    for (const [key, value] of this.counters.entries()) {
      counters[key] = value;
    }

    const histograms: MetricsSnapshot['histograms'] = {};
    for (const [key, bucket] of this.histograms.entries()) {
      const values = [...bucket.values].sort((a, b) => a - b);
      const count = values.length;
      histograms[key] = {
        count,
        p50: this.quantileFromSorted(values, 0.5),
        p95: this.quantileFromSorted(values, 0.95),
        min: values[0] ?? 0,
        max: values[count - 1] ?? 0
      };
    }

    return { timestamp: new Date().toISOString(), counters, histograms };
  }

  private quantile(metric: string, q: number, tags?: Record<string, string>): number {
    const bucket = this.histograms.get(this.makeKey(metric, tags));
    if (!bucket || bucket.values.length === 0) {
      return 0;
    }

    const sorted = [...bucket.values].sort((a, b) => a - b);
    return this.quantileFromSorted(sorted, q);
  }

  private quantileFromSorted(sorted: number[], q: number): number {
    if (sorted.length === 0) {
      return 0;
    }
    const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q)));
    return sorted[index] ?? 0;
  }

  private makeKey(metric: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return metric;
    }

    const tagSuffix = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
    return `${metric}|${tagSuffix}`;
  }
}

export async function trackAsync<T>(
  metrics: MetricsCollector,
  metricName: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const started = Date.now();
  try {
    const result = await fn();
    metrics.observe(metricName, Date.now() - started, tags);
    return result;
  } catch (error: unknown) {
    metrics.observe(metricName, Date.now() - started, {
      ...(tags ?? {}),
      status: 'error'
    });
    throw error;
  }
}

export function createTimer(metrics: MetricsCollector, metricName: string, tags?: Record<string, string>): () => void {
  const started = Date.now();
  return () => {
    metrics.observe(metricName, Date.now() - started, tags);
  };
}

export function bindRuntimeObservability(target: RuntimeHookTarget, handlers: RuntimeHookHandlers): () => void {
  const unsubscribeError = target.onError(async (error) => {
    handlers.onError?.({ error });
  });

  return () => {
    unsubscribeError();
  };
}

export function attachBotObservability(target: BotLikeEventTarget, options: AttachBotObservabilityOptions): () => void {
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
        ...(redacted ?? {})
      }
    });
  };

  options.metrics.increment('bot_launch_total', 1, {
    service: options.serviceName
  });
  log('info', 'bot_launch');

  if (target.onError) {
    const unsubscribeError = target.onError((error) => {
      options.metrics.increment('bot_runtime_error_total', 1, {
        service: options.serviceName
      });
      log('error', 'bot_runtime_error', {
        message: error instanceof Error ? error.message : 'unknown'
      });
    });
    unsubscribers.push(unsubscribeError);
  }

  if (target.on) {
    unsubscribers.push(
      target.on('update', (payload) => {
        const update = payload as Record<string, unknown>;
        const updateType = Object.keys(update).find((key) => key !== 'update_id' && update[key] !== undefined) ?? 'unknown';
        options.metrics.increment('bot_update_total', 1, {
          service: options.serviceName,
          update_type: updateType
        });
      })
    );
    unsubscribers.push(
      target.on('api_call', (payload) => {
        const method = (payload as { method?: string }).method ?? 'unknown';
        options.metrics.increment('bot_api_call_total', 1, {
          service: options.serviceName,
          method
        });
      })
    );
    unsubscribers.push(
      target.on('api_result', (payload) => {
        const event = payload as { method?: string; durationMs?: number };
        const method = event.method ?? 'unknown';
        options.metrics.observe('bot_api_latency_ms', event.durationMs ?? 0, {
          service: options.serviceName,
          method
        });
      })
    );
    unsubscribers.push(
      target.on('api_error', (payload) => {
        const method = (payload as { method?: string }).method ?? 'unknown';
        options.metrics.increment('bot_api_error_total', 1, {
          service: options.serviceName,
          method
        });
      })
    );
  }

  return () => {
    for (const unsubscribe of unsubscribers) {
      unsubscribe();
    }
    options.metrics.increment('bot_shutdown_total', 1, {
      service: options.serviceName
    });
    log('info', 'bot_shutdown');
  };
}
