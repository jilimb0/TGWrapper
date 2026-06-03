import type { TraceSpan } from './index.js';

export interface OtelReadableSpan {
  name: string;
  kind: number; // SpanKind.INTERNAL = 0, SpanKind.SERVER = 1
  spanContext: () => {
    traceId: string;
    spanId: string;
    traceFlags: number;
  };
  parentSpanId?: string;
  startTime: [number, number]; // [seconds, nanoseconds]
  endTime?: [number, number];
  status: {
    code: number; // 0 = UNSET, 1 = OK, 2 = ERROR
    message?: string;
  };
  attributes: Record<string, string | number | boolean>;
}

/**
 * Maps a TGWrapper TraceSpan into a format compatible with standard OpenTelemetry SDK processors.
 */
export function toOtelReadableSpan(span: TraceSpan): OtelReadableSpan {
  const startSec = Math.floor(span.startTime / 1000);
  const startNanos = (span.startTime % 1000) * 1_000_000;
  
  let endSec = startSec;
  let endNanos = startNanos;
  if (span.endTime) {
    endSec = Math.floor(span.endTime / 1000);
    endNanos = (span.endTime % 1000) * 1_000_000;
  }

  return {
    name: span.name,
    kind: 0, // SpanKind.INTERNAL
    spanContext: () => ({
      traceId: span.traceId,
      spanId: span.spanId,
      traceFlags: 1 // Recorded
    }),
    parentSpanId: span.parentSpanId,
    startTime: [startSec, startNanos],
    endTime: span.endTime ? [endSec, endNanos] : undefined,
    status: {
      code: span.status === 'ok' ? 1 : span.status === 'error' ? 2 : 0
    },
    attributes: { ...span.attributes }
  };
}
