import { AsyncLocalStorage } from 'node:async_hooks';

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

export interface CorrelationContext {
  traceId?: string;
  spanId?: string;
  requestId?: string;
  updateId?: string;
  userId?: string;
  chatId?: string;
  tenantId?: string;
}

const correlationStorage = new AsyncLocalStorage<CorrelationContext>();
let correlationContextCurrent: CorrelationContext = {};

export function withCorrelationContext<T>(context: CorrelationContext, fn: () => T): T {
  const store = correlationStorage.getStore();
  if (store !== undefined) {
    return correlationStorage.run({ ...store, ...context }, fn);
  }
  const previous = correlationContextCurrent;
  correlationContextCurrent = { ...previous, ...context };
  try {
    return fn();
  } finally {
    correlationContextCurrent = previous;
  }
}

export function getCorrelationContext(): CorrelationContext {
  return correlationStorage.getStore() ?? correlationContextCurrent;
}

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  status?: 'ok' | 'error';
  attributes: Record<string, string | number | boolean>;
}

export interface TraceSnapshot {
  activeSpans: number;
  completedSpans: number;
  latest?: TraceSpan;
}

export class Tracer {
  private readonly active = new Map<string, TraceSpan>();
  private readonly completed: TraceSpan[] = [];

  public startSpan(name: string, attributes: Record<string, string | number | boolean> = {}): TraceSpan {
    const context = getCorrelationContext();
    const traceId = context.traceId ?? generateId(32);
    const spanId = generateId(16);
    const span: TraceSpan = {
      traceId,
      spanId,
      name,
      startTime: Date.now(),
      attributes
    };
    if (context.spanId) {
      span.parentSpanId = context.spanId;
    }
    this.active.set(spanId, span);
    return span;
  }

  public endSpan(span: TraceSpan, status: 'ok' | 'error' = 'ok'): TraceSpan {
    const current = this.active.get(span.spanId) ?? span;
    current.endTime = Date.now();
    current.status = status;
    this.active.delete(span.spanId);
    this.completed.push(current);
    return current;
  }

  public withSpan<T>(name: string, fn: () => Promise<T> | T, attributes: Record<string, string | number | boolean> = {}): Promise<T> {
    const span = this.startSpan(name, attributes);
    return Promise.resolve(
      withCorrelationContext(
        {
          traceId: span.traceId,
          spanId: span.spanId
        },
        fn
      )
    )
      .then((result) => {
        this.endSpan(span, 'ok');
        return result;
      })
      .catch((error: unknown) => {
        this.endSpan(span, 'error');
        throw error;
      });
  }

  public snapshot(): TraceSnapshot {
    const snapshot: TraceSnapshot = {
      activeSpans: this.active.size,
      completedSpans: this.completed.length
    };
    const latest = this.completed[this.completed.length - 1];
    if (latest) {
      snapshot.latest = latest;
    }
    return snapshot;
  }

  public extractHeaders(): Record<string, string> {
    const ctx = getCorrelationContext();
    if (!ctx.traceId || !ctx.spanId) {
      return {};
    }
    return {
      traceparent: `00-${ctx.traceId}-${ctx.spanId}-01`
    };
  }

  public injectHeaders(headers: Record<string, string>): void {
    const parent = headers.traceparent;
    if (!parent) {
      return;
    }
    const parts = parent.split('-');
    if (parts.length < 4) {
      return;
    }
    const [, traceId, spanId] = parts;
    if (traceId && spanId) {
      withCorrelationContext({ traceId, spanId }, () => undefined);
    }
  }
}

export type ErrorClass = 'transport' | 'api' | 'runtime' | 'db' | 'queue' | 'unknown';

export interface ObservabilityError {
  class: ErrorClass;
  code: string;
  retryable: boolean;
  source: string;
  message: string;
}

export function classifyError(error: unknown, source = 'unknown'): ObservabilityError {
  const input = error as { name?: string; message?: string; code?: string; retryable?: boolean; class?: ErrorClass };
  const message = input?.message ?? 'unknown';
  const code = typeof input?.code === 'string' ? input.code : 'UNKNOWN';
  const retryable = Boolean(input?.retryable);

  const name = (input?.name ?? '').toLowerCase();
  const explicitClass = input?.class;
  if (explicitClass) {
    return { class: explicitClass, code, retryable, source, message };
  }
  if (name.includes('redis') || name.includes('db')) {
    return { class: 'db', code, retryable, source, message };
  }
  if (name.includes('queue')) {
    return { class: 'queue', code, retryable, source, message };
  }
  if (name.includes('api') || code.startsWith('API_')) {
    return { class: 'api', code, retryable, source, message };
  }
  if (name.includes('network') || name.includes('fetch') || code.startsWith('NET_')) {
    return { class: 'transport', code, retryable, source, message };
  }
  if (name.length > 0) {
    return { class: 'runtime', code, retryable, source, message };
  }
  return { class: 'unknown', code, retryable, source, message };
}

export interface SamplingOptions {
  sampleRate?: number;
  maxSeriesPerMetric?: number;
  allowedTagKeys?: string[];
  maxSeriesUpdatesPerSecond?: number;
}

export interface HistogramConfig {
  buckets?: number[];
}

interface HistogramBucketState {
  values: number[];
  counts: number[];
  buckets: number[];
  sum: number;
  min: number;
  max: number;
}

interface SeriesGateState {
  second: number;
  accepted: number;
}

export interface HistogramSnapshot {
  count: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  sum: number;
  buckets: Record<string, number>;
}

export interface MetricsSnapshot {
  timestamp: string;
  counters: Record<string, number>;
  histograms: Record<string, HistogramSnapshot>;
}

export interface ObservabilityHealth {
  status: 'ok' | 'degraded';
  droppedMetrics: number;
  droppedBySampling: number;
  droppedByCardinality: number;
  droppedByRateLimit: number;
  exporterQueueDepth: number;
  exportLagMs: number;
  lastExportAt?: string;
}

export class MetricsRegistry implements MetricsCollector {
  private readonly counters = new Map<string, number>();
  private readonly histograms = new Map<string, HistogramBucketState>();
  private readonly seriesByMetric = new Map<string, Set<string>>();
  private readonly seriesGate = new Map<string, SeriesGateState>();

  private readonly buckets: number[];
  private readonly sampleRate: number;
  private readonly maxSeriesPerMetric: number;
  private readonly allowedTagKeys: Set<string> | undefined;
  private readonly maxSeriesUpdatesPerSecond: number;

  private droppedMetrics = 0;
  private droppedBySampling = 0;
  private droppedByCardinality = 0;
  private droppedByRateLimit = 0;
  private exporterQueueDepth = 0;
  private lastExportAtEpoch?: number;

  public constructor(options: SamplingOptions & HistogramConfig = {}) {
    this.buckets = options.buckets ?? [1, 5, 10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000, 10_000];
    this.sampleRate = Math.max(0, Math.min(1, options.sampleRate ?? 1));
    this.maxSeriesPerMetric = options.maxSeriesPerMetric ?? 500;
    this.allowedTagKeys = options.allowedTagKeys ? new Set(options.allowedTagKeys) : undefined;
    this.maxSeriesUpdatesPerSecond = options.maxSeriesUpdatesPerSecond ?? 2_000;
  }

  public increment(metric: string, value = 1, tags?: Record<string, string>): void {
    const key = this.makeKey(metric, tags);
    if (!key) {
      return;
    }
    this.counters.set(key, (this.counters.get(key) ?? 0) + value);
  }

  public observe(metric: string, value: number, tags?: Record<string, string>): void {
    const key = this.makeKey(metric, tags);
    if (!key) {
      return;
    }
    const current: HistogramBucketState =
      this.histograms.get(key) ??
      {
        values: [],
        counts: new Array(this.buckets.length).fill(0),
        buckets: this.buckets,
        sum: 0,
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY
      };

    current.values.push(value);
    current.sum += value;
    current.min = Math.min(current.min, value);
    current.max = Math.max(current.max, value);

    for (let i = 0; i < current.buckets.length; i += 1) {
      const bound = current.buckets[i];
      if (bound !== undefined && value <= bound) {
        current.counts[i] = (current.counts[i] ?? 0) + 1;
      }
    }
    this.histograms.set(key, current);
  }

  public getCounter(metric: string, tags?: Record<string, string>): number {
    return this.counters.get(this.composeSeriesKey(metric, this.normalizeTags(tags))) ?? 0;
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

    const histograms: Record<string, HistogramSnapshot> = {};
    for (const [key, state] of this.histograms.entries()) {
      const sorted = [...state.values].sort((a, b) => a - b);
      const buckets: Record<string, number> = {};
      for (let i = 0; i < state.buckets.length; i += 1) {
        buckets[`le_${state.buckets[i]}`] = state.counts[i] ?? 0;
      }

      histograms[key] = {
        count: state.values.length,
        p50: this.quantileFromSorted(sorted, 0.5),
        p90: this.quantileFromSorted(sorted, 0.9),
        p95: this.quantileFromSorted(sorted, 0.95),
        p99: this.quantileFromSorted(sorted, 0.99),
        min: state.min === Number.POSITIVE_INFINITY ? 0 : state.min,
        max: state.max === Number.NEGATIVE_INFINITY ? 0 : state.max,
        sum: state.sum,
        buckets
      };
    }

    return {
      timestamp: new Date().toISOString(),
      counters,
      histograms
    };
  }

  public health(): ObservabilityHealth {
    const lastExportAt = this.lastExportAtEpoch ? new Date(this.lastExportAtEpoch).toISOString() : undefined;
    const exportLagMs = this.lastExportAtEpoch ? Date.now() - this.lastExportAtEpoch : 0;
    const status = this.droppedMetrics > 0 || exportLagMs > 30_000 ? 'degraded' : 'ok';
    return {
      status,
      droppedMetrics: this.droppedMetrics,
      droppedBySampling: this.droppedBySampling,
      droppedByCardinality: this.droppedByCardinality,
      droppedByRateLimit: this.droppedByRateLimit,
      exporterQueueDepth: this.exporterQueueDepth,
      exportLagMs,
      ...(lastExportAt ? { lastExportAt } : {})
    };
  }

  public markExportResult(queueDepth: number): void {
    this.exporterQueueDepth = Math.max(0, queueDepth);
    this.lastExportAtEpoch = Date.now();
  }

  private quantile(metric: string, q: number, tags?: Record<string, string>): number {
    const key = this.composeSeriesKey(metric, this.normalizeTags(tags));
    const state = this.histograms.get(key);
    if (!state || state.values.length === 0) {
      return 0;
    }
    const sorted = [...state.values].sort((a, b) => a - b);
    return this.quantileFromSorted(sorted, q);
  }

  private quantileFromSorted(sorted: number[], q: number): number {
    if (sorted.length === 0) {
      return 0;
    }
    const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q)));
    return sorted[index] ?? 0;
  }

  private normalizeTags(tags?: Record<string, string>): Record<string, string> {
    if (!tags) {
      return {};
    }
    if (!this.allowedTagKeys) {
      return tags;
    }
    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(tags)) {
      if (this.allowedTagKeys.has(key)) {
        filtered[key] = value;
      }
    }
    return filtered;
  }

  private makeKey(metric: string, tags?: Record<string, string>): string | null {
    if (this.sampleRate < 1 && Math.random() > this.sampleRate) {
      this.droppedMetrics += 1;
      this.droppedBySampling += 1;
      return null;
    }

    const normalized = this.normalizeTags(tags);
    const seriesKey = this.composeSeriesKey(metric, normalized);

    const metricSeries = this.seriesByMetric.get(metric) ?? new Set<string>();
    if (!metricSeries.has(seriesKey) && metricSeries.size >= this.maxSeriesPerMetric) {
      this.droppedMetrics += 1;
      this.droppedByCardinality += 1;
      return null;
    }

    const nowSecond = Math.floor(Date.now() / 1000);
    const gateKey = `${metric}:${seriesKey}`;
    const gate = this.seriesGate.get(gateKey) ?? { second: nowSecond, accepted: 0 };
    if (gate.second !== nowSecond) {
      gate.second = nowSecond;
      gate.accepted = 0;
    }
    if (gate.accepted >= this.maxSeriesUpdatesPerSecond) {
      this.droppedMetrics += 1;
      this.droppedByRateLimit += 1;
      this.seriesGate.set(gateKey, gate);
      return null;
    }
    gate.accepted += 1;
    this.seriesGate.set(gateKey, gate);

    metricSeries.add(seriesKey);
    this.seriesByMetric.set(metric, metricSeries);
    return seriesKey;
  }

  private composeSeriesKey(metric: string, tags: Record<string, string>): string {
    if (Object.keys(tags).length === 0) {
      return metric;
    }
    const tagSuffix = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
    return `${metric}|${tagSuffix}`;
  }
}

export class InMemoryMetrics extends MetricsRegistry {}

export interface PrometheusExportOptions {
  includeTimestamp?: boolean;
}

export function renderPrometheusMetrics(snapshot: MetricsSnapshot, options: PrometheusExportOptions = {}): string {
  const lines: string[] = [];
  const timestamp = options.includeTimestamp ? Date.parse(snapshot.timestamp) : undefined;

  for (const [series, value] of Object.entries(snapshot.counters)) {
    const parsed = parseSeriesKey(series);
    lines.push(`# TYPE ${parsed.metric} counter`);
    lines.push(`${parsed.metric}${toPromLabels(parsed.tags)} ${value}${timestamp !== undefined ? ` ${timestamp}` : ''}`);
  }

  for (const [series, histogram] of Object.entries(snapshot.histograms)) {
    const parsed = parseSeriesKey(series);
    lines.push(`# TYPE ${parsed.metric} histogram`);
    for (const [bound, count] of Object.entries(histogram.buckets)) {
      const labels = { ...parsed.tags, le: bound.replace('le_', '') };
      lines.push(`${parsed.metric}_bucket${toPromLabels(labels)} ${count}`);
    }
    lines.push(`${parsed.metric}_count${toPromLabels(parsed.tags)} ${histogram.count}`);
    lines.push(`${parsed.metric}_sum${toPromLabels(parsed.tags)} ${histogram.sum}`);
  }

  return lines.join('\n');
}

export class PrometheusExporter {
  private readonly registry: MetricsRegistry;

  public constructor(registry: MetricsRegistry) {
    this.registry = registry;
  }

  public export(): string {
    return renderPrometheusMetrics(this.registry.snapshot(), { includeTimestamp: false });
  }
}

export interface OtlpExporterOptions {
  endpoint: string;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

export class OtlpMetricsExporter {
  private readonly registry: MetricsRegistry;
  private readonly endpoint: string;
  private readonly headers: Record<string, string>;
  private readonly fetchImpl: typeof fetch;
  private queueDepth = 0;

  public constructor(registry: MetricsRegistry, options: OtlpExporterOptions) {
    this.registry = registry;
    this.endpoint = options.endpoint;
    this.headers = options.headers ?? {};
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  public buildPayload(): JsonObject {
    const snapshot = this.registry.snapshot();
    const resourceMetrics: {
      resource: { attributes: JsonObject[] };
      scopeMetrics: Array<{ scope: { name: string }; metrics: JsonObject[] }>;
    } = {
      resource: {
        attributes: [] as JsonObject[]
      },
      scopeMetrics: [
        {
          scope: { name: '@jilimb0/tgwrapper-observability' },
          metrics: [] as JsonObject[]
        }
      ]
    };

    const firstScope = resourceMetrics.scopeMetrics[0];
    if (!firstScope) {
      return { resourceMetrics: [resourceMetrics] };
    }
    const metrics = firstScope.metrics;
    for (const [series, value] of Object.entries(snapshot.counters)) {
      const parsed = parseSeriesKey(series);
      metrics.push({
        name: parsed.metric,
        sum: {
          dataPoints: [
            {
              asDouble: value,
              attributes: Object.entries(parsed.tags).map(([key, val]) => ({ key, value: { stringValue: val } }))
            }
          ],
          aggregationTemporality: 2,
          isMonotonic: true
        }
      });
    }

    return {
      resourceMetrics: [resourceMetrics]
    };
  }

  public async export(): Promise<void> {
    this.queueDepth += 1;
    const payload = this.buildPayload();
    try {
      await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...this.headers
        },
        body: JSON.stringify(payload)
      });
    } finally {
      this.queueDepth = Math.max(0, this.queueDepth - 1);
      this.registry.markExportResult(this.queueDepth);
    }
  }
}

export interface AttachBotObservabilityOptions {
  metrics: MetricsCollector;
  logger?: Logger;
  serviceName: string;
  tenantId?: string;
  botId?: string;
  redact?: (data: JsonObject | undefined) => JsonObject | undefined;
}

export interface RuntimeEventHookMap {
  onBotUpdate?: (event: { updateType: string; tenantKey?: string }) => void | Promise<void>;
  onRuntimeError?: (event: { error: unknown }) => void | Promise<void>;
  onApiCall?: (event: { method: string }) => void | Promise<void>;
  onApiResult?: (event: { method: string; durationMs: number }) => void | Promise<void>;
  onApiError?: (event: { method: string; error: unknown; retrying?: boolean }) => void | Promise<void>;
  onQueueEvent?: (event: { queue: string; action: 'enqueue' | 'dequeue' | 'drop'; durationMs?: number }) => void | Promise<void>;
  onDbEvent?: (event: { operation: string; durationMs?: number; error?: unknown }) => void | Promise<void>;
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
        ...(tenantKey ? { tenant: tenantKey } : {})
      });
    },
    onRuntimeError: ({ error }) => {
      const classified = classifyError(error, 'runtime');
      options.metrics.increment('bot_runtime_error_total', 1, {
        service: options.serviceName,
        class: classified.class,
        code: classified.code
      });
    },
    onApiCall: ({ method }) => {
      options.metrics.increment('bot_api_call_total', 1, {
        service: options.serviceName,
        method
      });
    },
    onApiResult: ({ method, durationMs }) => {
      options.metrics.observe('bot_api_latency_ms', durationMs, {
        service: options.serviceName,
        method
      });
    },
    onApiError: ({ method, error, retrying }) => {
      const classified = classifyError(error, 'api');
      options.metrics.increment('bot_api_error_total', 1, {
        service: options.serviceName,
        method,
        class: classified.class,
        retrying: retrying ? 'true' : 'false'
      });
    },
    onQueueEvent: ({ queue, action, durationMs }) => {
      options.metrics.increment('queue_events_total', 1, {
        service: options.serviceName,
        queue,
        action
      });
      if (durationMs !== undefined) {
        options.metrics.observe('queue_latency_ms', durationMs, {
          service: options.serviceName,
          queue,
          action
        });
      }
    },
    onDbEvent: ({ operation, durationMs, error }) => {
      options.metrics.increment('db_events_total', 1, {
        service: options.serviceName,
        operation,
        status: error ? 'error' : 'ok'
      });
      if (durationMs !== undefined) {
        options.metrics.observe('db_latency_ms', durationMs, {
          service: options.serviceName,
          operation
        });
      }
    }
  };
}

export class EcsJsonLogger implements Logger {
  private readonly context: EcsContext;
  private readonly sink: LogSink;

  public constructor(context: EcsContext, sink: LogSink) {
    this.context = context;
    this.sink = sink;
  }

  public log(event: LogEvent): void {
    const correlation = getCorrelationContext();
    const payload: Record<string, unknown> = {
      '@timestamp': event.timestamp,
      'log.level': event.level,
      message: event.event,
      'service.name': this.context.serviceName,
      'event.action': event.event,
      'labels.tenant_id': this.context.tenantId,
      'labels.bot_id': this.context.botId,
      'labels.request_id': event.requestId ?? correlation.requestId,
      'labels.trace_id': correlation.traceId,
      'labels.span_id': correlation.spanId,
      'labels.user_id': correlation.userId,
      'labels.chat_id': correlation.chatId,
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
      const classified = classifyError(error, 'runtime');
      options.metrics.increment('bot_runtime_error_total', 1, {
        service: options.serviceName,
        class: classified.class,
        code: classified.code
      });
      log('error', 'bot_runtime_error', {
        message: classified.message,
        class: classified.class,
        code: classified.code
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
        const event = payload as { method?: string; error?: unknown; retrying?: boolean };
        const method = event.method ?? 'unknown';
        const classified = classifyError(event.error, 'api');
        options.metrics.increment('bot_api_error_total', 1, {
          service: options.serviceName,
          method,
          class: classified.class,
          code: classified.code,
          retrying: event.retrying ? 'true' : 'false'
        });
      })
    );
    unsubscribers.push(
      target.on('queue_event', (payload) => {
        const event = payload as { queue?: string; action?: 'enqueue' | 'dequeue' | 'drop'; durationMs?: number };
        const queue = event.queue ?? 'default';
        const action = event.action ?? 'enqueue';
        options.metrics.increment('queue_events_total', 1, {
          service: options.serviceName,
          queue,
          action
        });
        if (event.durationMs !== undefined) {
          options.metrics.observe('queue_latency_ms', event.durationMs, {
            service: options.serviceName,
            queue,
            action
          });
        }
      })
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
          ...(classified ? { class: classified.class } : {})
        });
        if (event.durationMs !== undefined) {
          options.metrics.observe('db_latency_ms', event.durationMs, {
            service: options.serviceName,
            operation
          });
        }
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

export function getObservabilityHealth(registry: MetricsRegistry): ObservabilityHealth {
  return registry.health();
}

function parseSeriesKey(series: string): { metric: string; tags: Record<string, string> } {
  const [metric, tagsRaw] = series.split('|', 2);
  const tags: Record<string, string> = {};
  const metricName = metric ?? 'unknown_metric';
  if (!tagsRaw) {
    return { metric: metricName, tags };
  }
  for (const part of tagsRaw.split(',')) {
    const [key, value] = part.split('=', 2);
    if (key && value !== undefined) {
      tags[key] = value;
    }
  }
  return { metric: metricName, tags };
}

function toPromLabels(tags: Record<string, string>): string {
  const keys = Object.keys(tags);
  if (keys.length === 0) {
    return '';
  }
  const entries = keys.sort().map((key) => `${key}="${escapePromLabel(tags[key] ?? '')}"`);
  return `{${entries.join(',')}}`;
}

function escapePromLabel(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function generateId(length: number): string {
  let out = '';
  while (out.length < length) {
    out += Math.random().toString(16).slice(2);
  }
  return out.slice(0, length);
}
