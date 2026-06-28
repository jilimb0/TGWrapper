import type {
  HistogramConfig,
  HistogramSnapshot,
  MetricsCollector,
  MetricsSnapshot,
  ObservabilityHealth,
  SamplingOptions,
} from './types.js';

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
    this.buckets = options.buckets ?? [
      1, 5, 10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000, 10_000,
    ];
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
    const current: HistogramBucketState = this.histograms.get(key) ?? {
      values: [],
      counts: new Array(this.buckets.length).fill(0),
      buckets: this.buckets,
      sum: 0,
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY,
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
        buckets,
      };
    }

    return {
      timestamp: new Date().toISOString(),
      counters,
      gauges,
      upDownCounters,
      histograms,
    };
  }

  public health(): ObservabilityHealth {
    const lastExportAt = this.lastExportAtEpoch
      ? new Date(this.lastExportAtEpoch).toISOString()
      : undefined;
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
      ...(lastExportAt ? { lastExportAt } : {}),
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

    if (
      this.counters.size + this.gauges.size + this.upDownCounters.size + this.histograms.size >
      100_000
    ) {
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
    const truncated =
      value.length > this.truncateLabelValuesAt
        ? value.slice(0, this.truncateLabelValuesAt)
        : value;
    if (this.hashLabelKeys.has(key)) {
      return fnv1a(truncated);
    }
    return truncated;
  }
}

export class InMemoryMetrics extends MetricsRegistry {}

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

export function parseSeriesKey(series: string): { metric: string; tags: Record<string, string> } {
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

export function toPromLabels(tags: Record<string, string>): string {
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
