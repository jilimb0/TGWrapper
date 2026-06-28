import { MetricsRegistry, parseSeriesKey } from '../metrics.js';
import type { JsonObject, OtlpExporterOptions, OtlpGrpcExporterOptions } from '../types.js';

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
        attributes: [] as JsonObject[],
      },
      scopeMetrics: [
        {
          scope: { name: '@tgwrapper/observability' },
          metrics: [] as JsonObject[],
        },
      ],
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
              attributes: Object.entries(parsed.tags).map(([key, val]) => ({
                key,
                value: { stringValue: val },
              })),
            },
          ],
          aggregationTemporality: 2,
          isMonotonic: true,
        },
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
              attributes: Object.entries(parsed.tags).map(([key, val]) => ({
                key,
                value: { stringValue: val },
              })),
            },
          ],
        },
      });
    }

    return {
      resourceMetrics: [resourceMetrics],
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
          ...this.headers,
        },
        body: JSON.stringify(payload),
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
          json: async () => ({}),
        }) as Response,
    });
    return http.buildPayload();
  }

  public async export(): Promise<void> {
    await this.send(this.buildPayload());
    this.registry.markExportResult(0);
  }
}
