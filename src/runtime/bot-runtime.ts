import { BoundedConcurrencyQueue } from '../guards/bounded-concurrency.js';
import { TokenBucketRateLimiter } from '../guards/token-bucket-rate-limiter.js';
import type { Logger, MetricsCollector, RuntimeHooks, RuntimeLifecycle, UpdateSource } from '../types/core.js';
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
  hooks?: RuntimeHooks;
}

export class BotRuntime implements RuntimeLifecycle {
  private readonly source: UpdateSource;
  private readonly handler: RuntimeHandler;
  private readonly pending = new Set<Promise<void>>();
  private readonly guards: RuntimeGuardOptions;
  private readonly errorHandlers = new Set<(error: unknown) => void | Promise<void>>();
  private running = false;

  public constructor(source: UpdateSource, handler: RuntimeHandler, guards: RuntimeGuardOptions = {}) {
    this.source = source;
    this.handler = handler;
    this.guards = guards;
  }

  public async start(): Promise<void> {
    this.running = true;
    await this.source.run(async (update) => {
      const task = this.processUpdate(update).finally(() => {
        this.pending.delete(task);
      });
      this.pending.add(task);
      await task;
    });
    this.running = false;
  }

  public async stop(): Promise<void> {
    await this.source.stop();
    await Promise.allSettled([...this.pending]);
    this.running = false;
  }

  public async shutdown(): Promise<void> {
    await this.stop();
  }

  public onError(handler: (error: unknown) => void | Promise<void>): () => void {
    this.errorHandlers.add(handler);
    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  public isRunning(): boolean {
    return this.running;
  }

  private async processUpdate(update: Update): Promise<void> {
    const startedAt = new Date().toISOString();
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
    await this.guards.hooks?.onUpdate?.({
      update,
      updateType,
      tenantKey,
      startedAt
    });

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
      await this.safeHandleUpdate(update, tenantKey, updateType, startedAt);
      return;
    }

    try {
      await this.guards.concurrencyQueue.run(async () => {
        await this.safeHandleUpdate(update, tenantKey, updateType, startedAt);
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

  private async safeHandleUpdate(update: Update, tenantKey: string, updateType: string, startedAt: string): Promise<void> {
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
      await this.guards.hooks?.onError?.({
        update,
        updateType,
        tenantKey,
        error,
        startedAt
      });
      for (const handler of this.errorHandlers) {
        await handler(error);
      }
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
