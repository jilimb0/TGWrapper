import { MetricsRegistry, parseSeriesKey, toPromLabels } from '../metrics.js';
import type { MetricsSnapshot, PrometheusExportOptions } from '../types.js';

export function renderPrometheusMetrics(
  snapshot: MetricsSnapshot,
  options: PrometheusExportOptions = {},
): string {
  const lines: string[] = [];
  const timestamp = options.includeTimestamp ? Date.parse(snapshot.timestamp) : undefined;

  for (const [series, value] of Object.entries(snapshot.counters)) {
    const parsed = parseSeriesKey(series);
    lines.push(`# TYPE ${parsed.metric} counter`);
    lines.push(
      `${parsed.metric}${toPromLabels(parsed.tags)} ${value}${timestamp !== undefined ? ` ${timestamp}` : ''}`,
    );
  }

  for (const [series, value] of Object.entries(snapshot.gauges)) {
    const parsed = parseSeriesKey(series);
    lines.push(`# TYPE ${parsed.metric} gauge`);
    lines.push(
      `${parsed.metric}${toPromLabels(parsed.tags)} ${value}${timestamp !== undefined ? ` ${timestamp}` : ''}`,
    );
  }

  for (const [series, value] of Object.entries(snapshot.upDownCounters)) {
    const parsed = parseSeriesKey(series);
    lines.push(`# TYPE ${parsed.metric} gauge`);
    lines.push(
      `${parsed.metric}${toPromLabels(parsed.tags)} ${value}${timestamp !== undefined ? ` ${timestamp}` : ''}`,
    );
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

export function createPrometheusScrapeHandler(registry: MetricsRegistry): () => string {
  return () => renderPrometheusMetrics(registry.snapshot(), { includeTimestamp: false });
}
