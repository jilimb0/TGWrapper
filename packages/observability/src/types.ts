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

export type ErrorClass = 'transport' | 'api' | 'runtime' | 'db' | 'queue' | 'unknown';

export interface ObservabilityError {
  class: ErrorClass;
  code: string;
  retryable: boolean;
  source: string;
  message: string;
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

export interface ExportEnvelope {
  kind: 'metrics' | 'trace' | 'log';
  payload: JsonObject;
  createdAt: number;
}

export interface Exporter {
  name: string;
  exportBatch(items: ExportEnvelope[]): Promise<void>;
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

export interface PrometheusExportOptions {
  includeTimestamp?: boolean;
}

export interface OtlpExporterOptions {
  endpoint: string;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

export interface OtlpGrpcExporterOptions {
  send: (payload: JsonObject) => Promise<void>;
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
