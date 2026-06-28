import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import {
  ApiClient,
  BotKernel,
  type Context,
  MemorySessionStorage,
  SessionManager,
  TreeRouter,
} from '../../src/index.js';
import type { SessionEnvelope } from '../../src/types/core.js';

type State = 'idle';
interface Data {
  count: number;
}

describe('Load: throughput baseline', () => {
  it('handles batch updates with acceptable throughput', async () => {
    const updates = Number(process.env.LOAD_UPDATES ?? '10000');
    const maxFailureRate = Number(process.env.LOAD_MAX_FAILURE_RATE ?? '0.001');

    const api = new ApiClient({
      token: 'TEST',
      mockResponder: async () => ({ ok: true }),
    });

    const storage = new MemorySessionStorage<SessionEnvelope<State, Data>>();
    const sessions = new SessionManager<State, Data>({
      storage,
      initialData: () => ({ count: 0 }),
    });

    const router = new TreeRouter<Context<State, Data>>();
    router.use(async (ctx) => {
      ctx.session.data.count += 1;
      await ctx.reply('ok');
    });

    const kernel = new BotKernel<State, Data>({
      apiClient: api,
      sessionManager: sessions,
      router,
      resolveSessionKey: (u) => String(u.message?.from?.id ?? '0'),
    });

    const update = {
      update_id: 1,
      message: {
        message_id: 1,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 1, type: 'private' as const },
        from: { id: 1, is_bot: false, first_name: 'u' },
        text: 'hi',
      },
    };

    const started = performance.now();
    let failures = 0;
    for (let idx = 0; idx < updates; idx += 1) {
      update.update_id = idx;
      try {
        await kernel.handleUpdate(update);
      } catch {
        failures += 1;
      }
    }
    const elapsedMs = performance.now() - started;
    const perSecond = Math.round((updates / elapsedMs) * 1000);
    const failureRate = failures / updates;
    const persisted = await storage.get('1');

    expect(perSecond).toBeGreaterThan(3000);
    expect(failureRate).toBeLessThanOrEqual(maxFailureRate);
    expect(persisted?.data.count).toBe(updates - failures);
  });
});
