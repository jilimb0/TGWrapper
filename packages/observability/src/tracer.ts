import { AsyncLocalStorage } from 'node:async_hooks';
import type { CorrelationContext, TraceSpan, TraceSnapshot } from './types.js';

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

export class Tracer {
  private readonly active = new Map<string, TraceSpan>();
  private readonly completed: TraceSpan[] = [];

  public startSpan(
    name: string,
    attributes: Record<string, string | number | boolean> = {},
  ): TraceSpan {
    const context = getCorrelationContext();
    const traceId = context.traceId ?? generateId(32);
    const spanId = generateId(16);
    const span: TraceSpan = {
      traceId,
      spanId,
      name,
      startTime: Date.now(),
      attributes,
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

  public withSpan<T>(
    name: string,
    fn: () => Promise<T> | T,
    attributes: Record<string, string | number | boolean> = {},
  ): Promise<T> {
    const span = this.startSpan(name, attributes);
    return Promise.resolve(
      withCorrelationContext(
        {
          traceId: span.traceId,
          spanId: span.spanId,
        },
        fn,
      ),
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
      completedSpans: this.completed.length,
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
      traceparent: `00-${ctx.traceId}-${ctx.spanId}-01`,
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

function generateId(length: number): string {
  let out = '';
  while (out.length < length) {
    out += Math.random().toString(16).slice(2);
  }
  return out.slice(0, length);
}
