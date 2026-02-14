import { describe, expect, it } from 'vitest';
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
  it('records unknown update type metrics instead of silently dropping visibility', async () => {
    const increments: Array<{ metric: string; tags?: Record<string, string> }> = [];
    const metrics: MetricsCollector = {
      increment: (metric, _value, tags) => {
        increments.push({ metric, tags });
      },
      observe: () => undefined
    };

    const runtime = new BotRuntime(new OneShotSource({ update_id: 1 } as Update), {
      handleUpdate: async () => undefined
    }, { metrics });

    await runtime.start();

    expect(increments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: 'runtime_updates_received',
          tags: expect.objectContaining({ update_type: 'unknown' })
        })
      ])
    );
  });

  it('falls back to default tenant when tenant resolver throws', async () => {
    const increments: Array<{ metric: string; tags?: Record<string, string> }> = [];
    const metrics: MetricsCollector = {
      increment: (metric, _value, tags) => {
        increments.push({ metric, tags });
      },
      observe: () => undefined
    };

    const runtime = new BotRuntime(new OneShotSource({ update_id: 2 } as Update), {
      handleUpdate: async () => {
        throw new Error('boom');
      }
    }, {
      metrics,
      tenantResolver: () => {
        throw new Error('tenant parse failed');
      }
    });

    await expect(runtime.start()).rejects.toThrow('boom');

    expect(increments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: 'runtime_handler_errors',
          tags: expect.objectContaining({ tenant: 'default' })
        })
      ])
    );
  });
});
