import type { ExportEnvelope, Exporter, ExportManagerOptions } from './types.js';

export class ConsoleJsonExporter implements Exporter {
  public readonly name = 'console';
  private readonly sink: (line: string) => void;

  public constructor(sink: (line: string) => void = (line) => console.log(line)) {
    this.sink = sink;
  }

  public async exportBatch(items: ExportEnvelope[]): Promise<void> {
    for (const item of items) {
      this.sink(JSON.stringify(item));
    }
  }
}

export class ExportManager {
  private readonly exporter: Exporter;
  private readonly queue: ExportEnvelope[] = [];
  private readonly queueSize: number;
  private readonly flushIntervalMs: number;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly backoffMs: number;
  private readonly circuitBreakerThreshold: number;
  private readonly circuitOpenMs: number;
  private readonly failOpen: boolean;

  private timer?: ReturnType<typeof setInterval>;
  private flushing = false;
  private failures = 0;
  private circuitOpenedAt = 0;
  private dropped = 0;
  private exportErrors = 0;

  public constructor(options: ExportManagerOptions) {
    this.exporter = options.exporter;
    this.queueSize = options.queueSize;
    this.flushIntervalMs = options.flushIntervalMs;
    this.timeoutMs = options.timeoutMs ?? 2_000;
    this.maxRetries = options.maxRetries ?? 3;
    this.backoffMs = options.backoffMs ?? 200;
    this.circuitBreakerThreshold = options.circuitBreakerThreshold ?? 5;
    this.circuitOpenMs = options.circuitOpenMs ?? 10_000;
    this.failOpen = options.failOpen ?? true;
  }

  public start(): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      void this.flush();
    }, this.flushIntervalMs);
    this.timer.unref?.();
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      delete this.timer;
    }
  }

  public enqueue(item: ExportEnvelope): void {
    if (this.queue.length >= this.queueSize) {
      this.dropped += 1;
      if (!this.failOpen) {
        throw new Error('Export queue overflow');
      }
      return;
    }
    this.queue.push(item);
  }

  public async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0) {
      return;
    }
    if (this.isCircuitOpen()) {
      return;
    }
    this.flushing = true;
    const batch = this.queue.splice(0, this.queue.length);
    try {
      await this.exportWithRetry(batch);
      this.failures = 0;
    } catch {
      this.exportErrors += 1;
      this.failures += 1;
      this.queue.unshift(...batch);
      if (this.failures >= this.circuitBreakerThreshold) {
        this.circuitOpenedAt = Date.now();
      }
    } finally {
      this.flushing = false;
    }
  }

  public async flushAndStop(): Promise<void> {
    this.stop();
    await this.flush();
  }

  public setupSignalHandlers(signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT']): () => void {
    const handlers = signals.map((signal) => {
      const handler = (): void => {
        void this.flushAndStop();
      };
      process.on(signal, handler);
      return { signal, handler };
    });
    return () => {
      for (const { signal, handler } of handlers) {
        process.off(signal, handler);
      }
    };
  }

  public diagnostics(): {
    queueDepth: number;
    dropped: number;
    exportErrors: number;
    circuitOpen: boolean;
  } {
    return {
      queueDepth: this.queue.length,
      dropped: this.dropped,
      exportErrors: this.exportErrors,
      circuitOpen: this.isCircuitOpen(),
    };
  }

  private async exportWithRetry(batch: ExportEnvelope[]): Promise<void> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        await withTimeout(this.exporter.exportBatch(batch), this.timeoutMs);
        return;
      } catch (error) {
        if (attempt >= this.maxRetries) {
          throw error;
        }
        const delay = this.backoffMs * 2 ** attempt;
        await sleep(delay);
      }
    }
  }

  private isCircuitOpen(): boolean {
    if (this.circuitOpenedAt === 0) {
      return false;
    }
    const openFor = Date.now() - this.circuitOpenedAt;
    if (openFor >= this.circuitOpenMs) {
      this.circuitOpenedAt = 0;
      return false;
    }
    return true;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`operation timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return (await Promise.race([promise, timeout])) as T;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
