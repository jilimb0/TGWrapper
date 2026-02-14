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
    const updateType = this.detectUpdateType(update);
    this.guards.metrics?.increment('runtime_updates_received', 1, { update_type: updateType });

    let tenantKey = 'default';
    if (this.guards.tenantResolver) {
      try {
        tenantKey = this.guards.tenantResolver(update);
      } catch (error: unknown) {
        this.guards.logger?.log({
          level: 'warn',
          event: 'runtime_tenant_resolver_failed',
          timestamp: new Date().toISOString(),
          data: {
            update_type: updateType,
            message: error instanceof Error ? error.message : 'unknown'
          }
        });
      }
    }

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
      await this.safeHandleUpdate(update, tenantKey, updateType);
      return;
    }

    try {
      await this.guards.concurrencyQueue.run(async () => {
        await this.safeHandleUpdate(update, tenantKey, updateType);
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

  private async safeHandleUpdate(update: Update, tenantKey: string, updateType: string): Promise<void> {
    try {
      await this.handler.handleUpdate(update);
    } catch (error: unknown) {
      this.guards.metrics?.increment('runtime_handler_errors', 1, {
        tenant: tenantKey,
        update_type: updateType
      });
      this.guards.logger?.log({
        level: 'error',
        event: 'runtime_handler_error',
        timestamp: new Date().toISOString(),
        data: {
          tenant: tenantKey,
          update_type: updateType,
          message: error instanceof Error ? error.message : 'unknown'
        }
      });
      throw error;
    }
  }

  private detectUpdateType(update: Update): string {
    for (const [key, value] of Object.entries(update)) {
      if (key === 'update_id') {
        continue;
      }
      if (value !== undefined) {
        return key;
      }
    }
    return 'unknown';
  }
}
