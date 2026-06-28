import type { JsonObject, LogEvent, Logger } from '../types/core.js';

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
