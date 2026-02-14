import type { MetricsCollector } from '../types/core.js';

interface HistogramBucket {
  values: number[];
}

export class InMemoryMetrics implements MetricsCollector {
  private readonly counters = new Map<string, number>();
  private readonly histograms = new Map<string, HistogramBucket>();

  public increment(metric: string, value = 1, tags?: Record<string, string>): void {
    const key = this.makeKey(metric, tags);
    this.counters.set(key, (this.counters.get(key) ?? 0) + value);
  }

  public observe(metric: string, value: number, tags?: Record<string, string>): void {
    const key = this.makeKey(metric, tags);
    const bucket = this.histograms.get(key) ?? { values: [] };
    bucket.values.push(value);
    this.histograms.set(key, bucket);
  }

  public getCounter(metric: string, tags?: Record<string, string>): number {
    return this.counters.get(this.makeKey(metric, tags)) ?? 0;
  }

  public latencyP50(metric: string, tags?: Record<string, string>): number {
    return this.quantile(metric, 0.5, tags);
  }

  public latencyP95(metric: string, tags?: Record<string, string>): number {
    return this.quantile(metric, 0.95, tags);
  }

  private quantile(metric: string, q: number, tags?: Record<string, string>): number {
    const bucket = this.histograms.get(this.makeKey(metric, tags));
    if (!bucket || bucket.values.length === 0) {
      return 0;
    }

    const sorted = [...bucket.values].sort((a, b) => a - b);
    const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q)));
    return sorted[index] ?? 0;
  }

  private makeKey(metric: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return metric;
    }

    const tagSuffix = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
    return `${metric}|${tagSuffix}`;
  }
}
