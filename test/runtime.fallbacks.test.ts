import { describe, expect, it } from 'vitest';
import { TokenBucketRateLimiter } from '../src/guards/token-bucket-rate-limiter.js';
import { BotRuntime } from '../src/runtime/bot-runtime.js';
import type { MetricsCollector, UpdateSource } from '../src/types/core.js';
import type { Update } from '../src/types/telegram.js';

class OneShotSource implements UpdateSource {
  public constructor(private readonly update: Update) {}

  public async run(onUpdate: (update: Update) => Promise<void>): Promise<void> {
    await onUpdate(this.update);
  }

  public async stop(): Promise<void> {
    return;
  }
}

describe('BotRuntime fallback behavior', () => {
  it('emits warning when in-memory rate limiter is used in production', async () => {
    const runtimeGlobal = globalThis as { process?: { env?: { NODE_ENV?: string } } };
    const previousNodeEnv = runtimeGlobal.process?.env?.NODE_ENV;
    runtimeGlobal.process = runtimeGlobal.process ?? {};
    runtimeGlobal.process.env = runtimeGlobal.process.env ?? {};
    runtimeGlobal.process.env.NODE_ENV = 'production';
    const events: string[] = [];

    try {
      const runtime = new BotRuntime(
        new OneShotSource({ update_id: 11 } as Update),
        {
          handleUpdate: async () => undefined,
        },
        {
          rateLimiter: new TokenBucketRateLimiter({ capacity: 1, refillPerSecond: 1 }),
          logger: {
            log: (event) => {
              events.push(event.event);
            },
          },
        },
      );

      await runtime.start();
      expect(events).toContain('runtime_in_memory_rate_limiter_in_production');
    } finally {
      runtimeGlobal.process = runtimeGlobal.process ?? {};
      runtimeGlobal.process.env = runtimeGlobal.process.env ?? {};
      runtimeGlobal.process.env.NODE_ENV = previousNodeEnv;
    }
  });

  it('records known metrics tag for newly added update types', async () => {
    const increments: Array<{ metric: string; tags?: Record<string, string> }> = [];
    const metrics: MetricsCollector = {
      increment: (metric, _value, tags) => {
        increments.push({ metric, tags });
      },
      observe: () => undefined,
    };

    const runtime = new BotRuntime(
      new OneShotSource({
        update_id: 10,
        purchased_paid_media: { paid_media_payload: 'x' },
      } as Update),
      {
        handleUpdate: async () => undefined,
      },
      { metrics },
    );

    await runtime.start();

    expect(increments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: 'runtime_updates_received',
          tags: expect.objectContaining({ update_type: 'purchased_paid_media' }),
        }),
      ]),
    );
  });

  it('records unknown update type metrics instead of silently dropping visibility', async () => {
    const increments: Array<{ metric: string; tags?: Record<string, string> }> = [];
    const metrics: MetricsCollector = {
      increment: (metric, _value, tags) => {
        increments.push({ metric, tags });
      },
      observe: () => undefined,
    };

    const runtime = new BotRuntime(
      new OneShotSource({ update_id: 1 } as Update),
      {
        handleUpdate: async () => undefined,
      },
      { metrics },
    );

    await runtime.start();

    expect(increments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: 'runtime_updates_received',
          tags: expect.objectContaining({ update_type: 'unknown' }),
        }),
      ]),
    );
  });

  it('falls back to default tenant when tenant resolver throws', async () => {
    const increments: Array<{ metric: string; tags?: Record<string, string> }> = [];
    const metrics: MetricsCollector = {
      increment: (metric, _value, tags) => {
        increments.push({ metric, tags });
      },
      observe: () => undefined,
    };

    const runtime = new BotRuntime(
      new OneShotSource({ update_id: 2 } as Update),
      {
        handleUpdate: async () => {
          throw new Error('boom');
        },
      },
      {
        metrics,
        tenantResolver: () => {
          throw new Error('tenant parse failed');
        },
      },
    );

    await expect(runtime.start()).rejects.toThrow('boom');

    expect(increments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: 'runtime_handler_errors',
          tags: expect.objectContaining({ tenant: 'default' }),
        }),
      ]),
    );
  });
});
