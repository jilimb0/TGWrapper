import { AsyncLocalStorage } from 'node:async_hooks';
import { performance } from 'node:perf_hooks';

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
  setGauge?(metric: string, value: number, tags?: Record<string, string>): void;
  addUpDownCounter?(metric: string, value: number, tags?: Record<string, string>): void;
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

export interface ObservableBot {
  on(event: string, handler: (payload: any) => void | Promise<void>): () => void;
  onError(handler: (error: unknown) => void | Promise<void>): () => void;
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
  deniedTagKeys?: string[];
  hashLabelKeys?: string[];
  truncateLabelValuesAt?: number;
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
  gauges: Record<string, number>;
  upDownCounters: Record<string, number>;
  histograms: Record<string, HistogramSnapshot>;
}

export interface ObservabilityHealth {
  status: 'ok' | 'degraded';
  droppedMetrics: number;
  droppedBySampling: number;
  droppedByCardinality: number;
  droppedByRateLimit: number;
  droppedInvalidLabel: number;
  droppedOverflow: number;
  exporterQueueDepth: number;
  exportLagMs: number;
  lastExportAt?: string;
}

export class MetricsRegistry implements MetricsCollector {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly upDownCounters = new Map<string, number>();
  private readonly histograms = new Map<string, HistogramBucketState>();
  private readonly seriesByMetric = new Map<string, Set<string>>();
  private readonly seriesGate = new Map<string, SeriesGateState>();

  private readonly buckets: number[];
  private readonly sampleRate: number;
  private readonly maxSeriesPerMetric: number;
  private readonly allowedTagKeys: Set<string> | undefined;
  private readonly deniedTagKeys: Set<string>;
  private readonly hashLabelKeys: Set<string>;
  private readonly truncateLabelValuesAt: number;
  private readonly maxSeriesUpdatesPerSecond: number;

  private droppedMetrics = 0;
  private droppedBySampling = 0;
  private droppedByCardinality = 0;
  private droppedByRateLimit = 0;
  private droppedInvalidLabel = 0;
  private droppedOverflow = 0;
  private exporterQueueDepth = 0;
  private lastExportAtEpoch?: number;

  public constructor(options: SamplingOptions & HistogramConfig = {}) {
    this.buckets = options.buckets ?? [1, 5, 10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000, 10_000];
    this.sampleRate = Math.max(0, Math.min(1, options.sampleRate ?? 1));
    this.maxSeriesPerMetric = options.maxSeriesPerMetric ?? 500;
    this.allowedTagKeys = options.allowedTagKeys ? new Set(options.allowedTagKeys) : undefined;
    this.deniedTagKeys = new Set(options.deniedTagKeys ?? []);
    this.hashLabelKeys = new Set(options.hashLabelKeys ?? []);
    this.truncateLabelValuesAt = Math.max(8, options.truncateLabelValuesAt ?? 64);
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

  public setGauge(metric: string, value: number, tags?: Record<string, string>): void {
    const key = this.makeKey(metric, tags);
    if (!key) {
      return;
    }
    this.gauges.set(key, value);
  }

  public addUpDownCounter(metric: string, value: number, tags?: Record<string, string>): void {
    const key = this.makeKey(metric, tags);
    if (!key) {
      return;
    }
    this.upDownCounters.set(key, (this.upDownCounters.get(key) ?? 0) + value);
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
    const gauges: Record<string, number> = {};
    for (const [key, value] of this.gauges.entries()) {
      gauges[key] = value;
    }
    const upDownCounters: Record<string, number> = {};
    for (const [key, value] of this.upDownCounters.entries()) {
      upDownCounters[key] = value;
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
      gauges,
      upDownCounters,
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
      droppedInvalidLabel: this.droppedInvalidLabel,
      droppedOverflow: this.droppedOverflow,
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
      if (!isValidLabelToken(key) || !isValidLabelToken(value)) {
        this.droppedMetrics += 1;
        this.droppedInvalidLabel += 1;
        continue;
      }
      if (this.deniedTagKeys.has(key)) {
        continue;
      }
      if (this.allowedTagKeys.has(key)) {
        filtered[key] = this.sanitizeValue(key, value);
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

    if (this.counters.size + this.gauges.size + this.upDownCounters.size + this.histograms.size > 100_000) {
      this.droppedMetrics += 1;
      this.droppedOverflow += 1;
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

  private sanitizeValue(key: string, value: string): string {
    const truncated = value.length > this.truncateLabelValuesAt ? value.slice(0, this.truncateLabelValuesAt) : value;
    if (this.hashLabelKeys.has(key)) {
      return fnv1a(truncated);
    }
    return truncated;
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

  for (const [series, value] of Object.entries(snapshot.gauges)) {
    const parsed = parseSeriesKey(series);
    lines.push(`# TYPE ${parsed.metric} gauge`);
    lines.push(`${parsed.metric}${toPromLabels(parsed.tags)} ${value}${timestamp !== undefined ? ` ${timestamp}` : ''}`);
  }

  for (const [series, value] of Object.entries(snapshot.upDownCounters)) {
    const parsed = parseSeriesKey(series);
    lines.push(`# TYPE ${parsed.metric} gauge`);
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

export interface OtlpGrpcExporterOptions {
  send: (payload: JsonObject) => Promise<void>;
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
          scope: { name: '@tgwrapper/observability' },
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

    for (const [series, value] of Object.entries(snapshot.gauges)) {
      const parsed = parseSeriesKey(series);
      metrics.push({
        name: parsed.metric,
        gauge: {
          dataPoints: [
            {
              asDouble: value,
              attributes: Object.entries(parsed.tags).map(([key, val]) => ({ key, value: { stringValue: val } }))
            }
          ]
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

export class OtlpGrpcMetricsExporter {
  private readonly registry: MetricsRegistry;
  private readonly send: (payload: JsonObject) => Promise<void>;

  public constructor(registry: MetricsRegistry, options: OtlpGrpcExporterOptions) {
    this.registry = registry;
    this.send = options.send;
  }

  public buildPayload(): JsonObject {
    const http = new OtlpMetricsExporter(this.registry, {
      endpoint: 'grpc://adapter',
      fetchImpl: async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({})
        }) as Response
    });
    return http.buildPayload();
  }

  public async export(): Promise<void> {
    await this.send(this.buildPayload());
    this.registry.markExportResult(0);
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

export type TelemetryFeatureFlags = {
  tracing?: boolean;
  metrics?: boolean;
  logs?: boolean;
  export?: boolean;
};

export interface ObservabilityConfig {
  enabled: boolean;
  serviceName: string;
  serviceVersion: string;
  env: 'dev' | 'staging' | 'prod' | string;
  sampleRate: number;
  exporter: 'otlp-http' | 'prometheus' | 'console';
  endpoint?: string;
  headers?: Record<string, string>;
  flushIntervalMs: number;
  queueSize: number;
  timeoutMs?: number;
  featureFlags?: TelemetryFeatureFlags;
  logLevel?: LogLevel;
}

export function validateObservabilityConfig(input: Partial<ObservabilityConfig>): { ok: true; value: ObservabilityConfig } | { ok: false; issues: string[] } {
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
    logLevel: input.logLevel ?? 'info'
  } satisfies Omit<ObservabilityConfig, 'endpoint' | 'timeoutMs'>;
  const value: ObservabilityConfig = {
    ...valueBase,
    ...(input.endpoint ? { endpoint: input.endpoint } : {}),
    ...(input.timeoutMs !== undefined ? { timeoutMs: input.timeoutMs } : { timeoutMs: 2_000 })
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

export interface ExportEnvelope {
  kind: 'metrics' | 'trace' | 'log';
  payload: JsonObject;
  createdAt: number;
}

export interface Exporter {
  name: string;
  exportBatch(items: ExportEnvelope[]): Promise<void>;
}

export class ConsoleJsonExporter implements Exporter {
  public readonly name = 'console';
  private readonly sink: (line: string) => void;

  public constructor(sink: (line: string) => void = (line) => console.log(line)) {
    this.sink = sink;
  }

  public async exportBatch(items: ExportEnvelope[]): Promise<void> {
    for (const item of items) {
      this.sink(JSON.stringify(item));
    }
  }
}

export interface ExportManagerOptions {
  exporter: Exporter;
  queueSize: number;
  flushIntervalMs: number;
  timeoutMs?: number;
  maxRetries?: number;
  backoffMs?: number;
  circuitBreakerThreshold?: number;
  circuitOpenMs?: number;
  failOpen?: boolean;
}

export class ExportManager {
  private readonly exporter: Exporter;
  private readonly queue: ExportEnvelope[] = [];
  private readonly queueSize: number;
  private readonly flushIntervalMs: number;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly backoffMs: number;
  private readonly circuitBreakerThreshold: number;
  private readonly circuitOpenMs: number;
  private readonly failOpen: boolean;

  private timer?: ReturnType<typeof setInterval>;
  private flushing = false;
  private failures = 0;
  private circuitOpenedAt = 0;
  private dropped = 0;
  private exportErrors = 0;

  public constructor(options: ExportManagerOptions) {
    this.exporter = options.exporter;
    this.queueSize = options.queueSize;
    this.flushIntervalMs = options.flushIntervalMs;
    this.timeoutMs = options.timeoutMs ?? 2_000;
    this.maxRetries = options.maxRetries ?? 3;
    this.backoffMs = options.backoffMs ?? 200;
    this.circuitBreakerThreshold = options.circuitBreakerThreshold ?? 5;
    this.circuitOpenMs = options.circuitOpenMs ?? 10_000;
    this.failOpen = options.failOpen ?? true;
  }

  public start(): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      void this.flush();
    }, this.flushIntervalMs);
    this.timer.unref?.();
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      delete this.timer;
    }
  }

  public enqueue(item: ExportEnvelope): void {
    if (this.queue.length >= this.queueSize) {
      this.dropped += 1;
      if (!this.failOpen) {
        throw new Error('Export queue overflow');
      }
      return;
    }
    this.queue.push(item);
  }

  public async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0) {
      return;
    }
    if (this.isCircuitOpen()) {
      return;
    }
    this.flushing = true;
    const batch = this.queue.splice(0, this.queue.length);
    try {
      await this.exportWithRetry(batch);
      this.failures = 0;
    } catch {
      this.exportErrors += 1;
      this.failures += 1;
      this.queue.unshift(...batch);
      if (this.failures >= this.circuitBreakerThreshold) {
        this.circuitOpenedAt = Date.now();
      }
    } finally {
      this.flushing = false;
    }
  }

  public async flushAndStop(): Promise<void> {
    this.stop();
    await this.flush();
  }

  public setupSignalHandlers(signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT']): () => void {
    const handlers = signals.map((signal) => {
      const handler = (): void => {
        void this.flushAndStop();
      };
      process.on(signal, handler);
      return { signal, handler };
    });
    return () => {
      for (const { signal, handler } of handlers) {
        process.off(signal, handler);
      }
    };
  }

  public diagnostics(): {
    queueDepth: number;
    dropped: number;
    exportErrors: number;
    circuitOpen: boolean;
  } {
    return {
      queueDepth: this.queue.length,
      dropped: this.dropped,
      exportErrors: this.exportErrors,
      circuitOpen: this.isCircuitOpen()
    };
  }

  private async exportWithRetry(batch: ExportEnvelope[]): Promise<void> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        await withTimeout(this.exporter.exportBatch(batch), this.timeoutMs);
        return;
      } catch (error) {
        if (attempt >= this.maxRetries) {
          throw error;
        }
        const delay = this.backoffMs * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  private isCircuitOpen(): boolean {
    if (this.circuitOpenedAt === 0) {
      return false;
    }
    const openFor = Date.now() - this.circuitOpenedAt;
    if (openFor >= this.circuitOpenMs) {
      this.circuitOpenedAt = 0;
      return false;
    }
    return true;
  }
}

export function createPrometheusScrapeHandler(registry: MetricsRegistry): () => string {
  return () => renderPrometheusMetrics(registry.snapshot(), { includeTimestamp: false });
}

export function createProcessMetricsSampler(
  registry: MetricsCollector,
  options: { intervalMs?: number } = {}
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
    registry.setGauge?.('process_active_handles', typeof (process as unknown as { _getActiveHandles?: () => unknown[] })._getActiveHandles === 'function'
      ? ((process as unknown as { _getActiveHandles: () => unknown[] })._getActiveHandles().length)
      : 0);
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}

export function instrumentUpdateHandler<TContext, TResult>(
  tracer: Tracer,
  metrics: MetricsCollector,
  fn: (ctx: TContext) => Promise<TResult>,
  attrs: Record<string, string | number | boolean> = {}
): (ctx: TContext) => Promise<TResult> {
  return async (ctx) => {
    const started = Date.now();
    return tracer.withSpan('update.handler', async () => {
      try {
        const result = await fn(ctx);
        metrics.increment('updates_total');
        metrics.observe('update_duration_ms', Date.now() - started);
        return result;
      } catch (error) {
        metrics.increment('errors_total', 1, { source: 'update' });
        throw error;
      }
    }, { component: 'handler', operation: 'update', ...attrs });
  };
}

export async function instrumentTelegramCall<TResult>(
  tracer: Tracer,
  metrics: MetricsCollector,
  method: string,
  fn: () => Promise<TResult>
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
    { component: 'telegram', operation: 'api_call', 'telegram.method': method }
  );
}

export async function instrumentDbOperation<TResult>(
  tracer: Tracer,
  metrics: MetricsCollector,
  operation: string,
  fn: () => Promise<TResult>,
  table?: string
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
    { component: 'db', operation, ...(table ? { 'db.table': table } : {}) }
  );
}

export async function instrumentQueueJob<TResult>(
  tracer: Tracer,
  metrics: MetricsCollector,
  queueName: string,
  fn: () => Promise<TResult>
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
    { component: 'queue', operation: 'job', 'queue.name': queueName }
  );
}

export async function instrumentScheduledTask<TResult>(
  tracer: Tracer,
  metrics: MetricsCollector,
  taskName: string,
  fn: () => Promise<TResult>
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
    { component: 'scheduler', operation: 'task' }
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
      enabled: params.config.enabled
    } as unknown as JsonValue,
    health: health as unknown as JsonValue,
    trace: trace as unknown as JsonValue,
    exporter: (exporter ?? {}) as unknown as JsonValue
  };
}

export class ConfigurableLogger implements Logger {
  private level: LogLevel;
  private readonly sink: (event: LogEvent) => void;
  private readonly sampleRateByLevel: Partial<Record<LogLevel, number>>;
  private readonly redact: ((data: JsonObject | undefined) => JsonObject | undefined) | undefined;

  public constructor(options: {
    level?: LogLevel;
    sink?: (event: LogEvent) => void;
    sampleRateByLevel?: Partial<Record<LogLevel, number>>;
    redact?: (data: JsonObject | undefined) => JsonObject | undefined;
  } = {}) {
    this.level = options.level ?? 'info';
    this.sink = options.sink ?? ((event) => console.log(JSON.stringify(event)));
    this.sampleRateByLevel = options.sampleRateByLevel ?? {};
    if (options.redact) {
      this.redact = options.redact;
    }
  }

  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  public log(event: LogEvent): void {
    if (!isEnabledLevel(this.level, event.level)) {
      return;
    }
    const sampleRate = this.sampleRateByLevel[event.level] ?? 1;
    if (sampleRate < 1 && Math.random() > sampleRate) {
      return;
    }
    const correlation = getCorrelationContext();
    const payload: LogEvent = {
      level: event.level,
      event: event.event,
      timestamp: event.timestamp
    };
    const requestId = event.requestId ?? correlation.requestId;
    if (requestId) {
      payload.requestId = requestId;
    }
    const data = this.redactSensitive(this.redact ? this.redact(event.data) : event.data);
    if (data) {
      payload.data = data;
    }
    this.sink(payload);
  }

  private redactSensitive(data: JsonObject | undefined): JsonObject | undefined {
    if (!data) {
      return data;
    }
    return redactSensitiveData(data);
  }
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

export function attachBotObservability(target: ObservableBot, options: AttachBotObservabilityOptions): () => void {
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

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16);
}

function isValidLabelToken(token: string): boolean {
  return /^[a-zA-Z0-9_.:-]{1,128}$/.test(token);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`operation timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return (await Promise.race([promise, timeout])) as T;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function isEnabledLevel(current: LogLevel, incoming: LogLevel): boolean {
  const order: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40
  };
  return order[incoming] >= order[current];
}

export function redactSensitiveData(data: JsonObject): JsonObject {
  const out: JsonObject = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }
    if (typeof value !== 'string') {
      out[key] = value;
      continue;
    }
    if (/(token|authorization|api[_-]?key|secret)/i.test(key)) {
      out[key] = '[REDACTED]';
      continue;
    }
    if (/(phone|email|card|text|message)/i.test(key)) {
      out[key] = maskSensitiveString(value);
      continue;
    }
    out[key] = value
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
      .replace(/\+?[0-9][0-9\-\s()]{6,}/g, '[REDACTED_PHONE]')
      .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[REDACTED_CARD]');
  }
  return out;
}

function maskSensitiveString(input: string): string {
  if (input.length <= 8) {
    return '[REDACTED]';
  }
  return `${input.slice(0, 2)}***${input.slice(-2)}`;
}

export * from './otel.js';
