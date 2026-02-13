import type { MetricsCollector } from '../types/core.js';

interface HistogramBucket {
  values: number[];
}

export class InMemoryMetrics implements MetricsCollector {
  private readonly counters = new Map<string, number>();
  private readonly histograms = new Map<string, HistogramBucket>();

  public increment(metric: string, value = 1): void {
    this.counters.set(metric, (this.counters.get(metric) ?? 0) + value);
  }

  public observe(metric: string, value: number): void {
    const bucket = this.histograms.get(metric) ?? { values: [] };
    bucket.values.push(value);
    this.histograms.set(metric, bucket);
  }

  public getCounter(metric: string): number {
    return this.counters.get(metric) ?? 0;
  }

  public latencyP50(metric: string): number {
    return this.quantile(metric, 0.5);
  }

  public latencyP95(metric: string): number {
    return this.quantile(metric, 0.95);
  }

  private quantile(metric: string, q: number): number {
    const bucket = this.histograms.get(metric);
    if (!bucket || bucket.values.length === 0) {
      return 0;
    }

    const sorted = [...bucket.values].sort((a, b) => a - b);
    const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q)));
    return sorted[index] ?? 0;
  }
}
