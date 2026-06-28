import type { EcsContext, JsonObject, LogEvent, LogLevel, Logger, LogSink } from './types.js';
import { getCorrelationContext } from './tracer.js';
import { redactSensitiveData } from './redact.js';

function isEnabledLevel(current: LogLevel, incoming: LogLevel): boolean {
  const order: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
  };
  return order[incoming] >= order[current];
}

export class ConfigurableLogger implements Logger {
  private level: LogLevel;
  private readonly sink: (event: LogEvent) => void;
  private readonly sampleRateByLevel: Partial<Record<LogLevel, number>>;
  private readonly redact: ((data: JsonObject | undefined) => JsonObject | undefined) | undefined;

  public constructor(
    options: {
      level?: LogLevel;
      sink?: (event: LogEvent) => void;
      sampleRateByLevel?: Partial<Record<LogLevel, number>>;
      redact?: (data: JsonObject | undefined) => JsonObject | undefined;
    } = {},
  ) {
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
      timestamp: event.timestamp,
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
      ...this.toFlatData(event.data),
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
