// types
export type {
  JsonValue,
  JsonObject,
  LogLevel,
  LogEvent,
  Logger,
  MetricsCollector,
  EcsContext,
  LogSink,
  RuntimeHookTarget,
  RuntimeHookHandlers,
  ObservableBot,
  CorrelationContext,
  TraceSpan,
  TraceSnapshot,
  ErrorClass,
  ObservabilityError,
  SamplingOptions,
  HistogramConfig,
  HistogramSnapshot,
  MetricsSnapshot,
  ObservabilityHealth,
  AttachBotObservabilityOptions,
  TelemetryFeatureFlags,
  ObservabilityConfig,
  ExportEnvelope,
  Exporter,
  ExportManagerOptions,
  PrometheusExportOptions,
  OtlpExporterOptions,
  OtlpGrpcExporterOptions,
  RuntimeEventHookMap,
} from './types.js';

// tracer
export { withCorrelationContext, getCorrelationContext, Tracer } from './tracer.js';

// errors
export { classifyError } from './errors.js';

// redact
export { redactSensitiveData } from './redact.js';

// metrics
export { MetricsRegistry, InMemoryMetrics } from './metrics.js';

// exporters/prometheus
export {
  renderPrometheusMetrics,
  PrometheusExporter,
  createPrometheusScrapeHandler,
} from './exporters/prometheus.js';

// exporters/otlp
export { OtlpMetricsExporter, OtlpGrpcMetricsExporter } from './exporters/otlp.js';

// export-manager
export { ConsoleJsonExporter, ExportManager } from './export-manager.js';

// logger
export { ConfigurableLogger, EcsJsonLogger } from './logger.js';

// instrumentation
export {
  instrumentUpdateHandler,
  instrumentTelegramCall,
  instrumentDbOperation,
  instrumentQueueJob,
  instrumentScheduledTask,
  createDiagnosticsSnapshot,
  createProcessMetricsSampler,
  attachBotObservability,
  getObservabilityHealth,
  trackAsync,
  createTimer,
  bindRuntimeObservability,
  createRuntimeObservabilityHooks,
  validateObservabilityConfig,
} from './instrumentation.js';

// otel
export { OtelReadableSpan, toOtelReadableSpan } from './otel.js';
