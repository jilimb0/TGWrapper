import { BoundedConcurrencyQueue } from '../guards/bounded-concurrency.js';
import { TokenBucketRateLimiter } from '../guards/token-bucket-rate-limiter.js';
import type { Logger, MetricsCollector, UpdateSource } from '../types/core.js';
import type { Update } from '../types/telegram.js';

export interface RuntimeHandler {
  handleUpdate(update: Update): Promise<void>;
}

export interface RuntimeGuardOptions {
  tenantResolver?: (update: Update) => string;
  rateLimiter?: TokenBucketRateLimiter;
  concurrencyQueue?: BoundedConcurrencyQueue;
  logger?: Logger;
  metrics?: MetricsCollector;
}

export class BotRuntime {
  private readonly source: UpdateSource;
  private readonly handler: RuntimeHandler;
  private readonly pending = new Set<Promise<void>>();
  private readonly guards: RuntimeGuardOptions;

  public constructor(source: UpdateSource, handler: RuntimeHandler, guards: RuntimeGuardOptions = {}) {
    this.source = source;
    this.handler = handler;
    this.guards = guards;
  }

  public async start(): Promise<void> {
    await this.source.run(async (update) => {
      const task = this.processUpdate(update).finally(() => {
        this.pending.delete(task);
      });
      this.pending.add(task);
      await task;
    });
  }

  public async shutdown(): Promise<void> {
    await this.source.stop();
    await Promise.allSettled([...this.pending]);
  }

  private async processUpdate(update: Update): Promise<void> {
    const tenantKey = this.guards.tenantResolver ? this.guards.tenantResolver(update) : 'default';

    if (this.guards.rateLimiter && !this.guards.rateLimiter.allow(tenantKey)) {
      this.guards.metrics?.increment('runtime_dropped_rate_limited', 1, { tenant: tenantKey });
      this.guards.logger?.log({
        level: 'warn',
        event: 'runtime_rate_limited',
        timestamp: new Date().toISOString(),
        data: { tenant: tenantKey }
      });
      return;
    }

    if (!this.guards.concurrencyQueue) {
      await this.handler.handleUpdate(update);
      return;
    }

    try {
      await this.guards.concurrencyQueue.run(async () => {
        await this.handler.handleUpdate(update);
      });
    } catch (error: unknown) {
      this.guards.metrics?.increment('runtime_dropped_queue_overflow', 1, { tenant: tenantKey });
      this.guards.logger?.log({
        level: 'error',
        event: 'runtime_queue_overflow',
        timestamp: new Date().toISOString(),
        data: {
          tenant: tenantKey,
          message: error instanceof Error ? error.message : 'unknown'
        }
      });
    }
  }
}
