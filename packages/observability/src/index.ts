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

  private quantile(metric: string, q: number, tags?: Record<string, string>): number {
    const bucket = this.histograms.get(this.makeKey(metric, tags));
    if (!bucket || bucket.values.length === 0) {
      return 0;
    }

    const sorted = [...bucket.values].sort((a, b) => a - b);
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
