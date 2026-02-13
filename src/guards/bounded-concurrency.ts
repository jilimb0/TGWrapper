export class QueueOverflowError extends Error {
  public constructor(limit: number) {
    super(`Concurrency queue is full (limit=${limit})`);
    this.name = 'QueueOverflowError';
  }
}

export class BoundedConcurrencyQueue {
  private running = 0;
  private readonly waiters: Array<() => void> = [];
  private readonly maxConcurrency: number;
  private readonly maxQueue: number;

  public constructor(maxConcurrency: number, maxQueue: number) {
    this.maxConcurrency = maxConcurrency;
    this.maxQueue = maxQueue;
  }

  public async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    if (this.running < this.maxConcurrency) {
      this.running += 1;
      return;
    }

    if (this.waiters.length >= this.maxQueue) {
      throw new QueueOverflowError(this.maxQueue);
    }

    await new Promise<void>((resolve) => {
      this.waiters.push(() => {
        this.running += 1;
        resolve();
      });
    });
  }

  private release(): void {
    this.running = Math.max(0, this.running - 1);
    const next = this.waiters.shift();
    if (next) {
      next();
    }
  }
}
