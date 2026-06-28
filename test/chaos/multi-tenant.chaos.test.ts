import { describe, expect, it } from 'vitest';
import {
  ApiClient,
  BotKernel,
  BoundedConcurrencyQueue,
  type Context,
  InMemoryMetrics,
  MemorySessionStorage,
  SessionManager,
  TokenBucketRateLimiter,
  TreeRouter,
} from '../../src/index.js';
import type { SessionEnvelope } from '../../src/types/core.js';

type State = 'idle';
interface Data {
  count: number;
}

function makeUpdate(updateId: number, userId: number, text: string) {
  return {
    update_id: updateId,
    message: {
      message_id: updateId,
      date: Math.floor(Date.now() / 1000),
      chat: { id: userId, type: 'private' as const },
      from: { id: userId, is_bot: false, first_name: 'u' },
      text,
    },
  };
}

describe('Chaos: multi-tenant contention', () => {
  it('keeps session integrity under concurrent tenant pressure', async () => {
    const maxQueueOverflowRatio = Number(process.env.CHAOS_MAX_QUEUE_OVERFLOW_RATIO ?? '0.01');
    const maxConflictsPerUpdate = Number(process.env.CHAOS_MAX_CONFLICTS_PER_UPDATE ?? '30');
    const metrics = new InMemoryMetrics();
    const api = new ApiClient({
      token: 'TEST',
      mockResponder: async () => ({ ok: true }),
      metrics,
    });

    const storage = new MemorySessionStorage<SessionEnvelope<State, Data>>();
    const sessions = new SessionManager<State, Data>({
      storage,
      initialData: () => ({ count: 0 }),
      conflictRetries: 50,
      metrics,
    });

    const router = new TreeRouter<Context<State, Data>>();
    router.use(async (ctx) => {
      const current = Number(ctx.session.data.count ?? 0);
      ctx.session.data.count = current + 1;
      await ctx.reply('ok');
    });

    const kernel = new BotKernel<State, Data>({
      apiClient: api,
      sessionManager: sessions,
      router,
      resolveSessionKey: (u) => String(u.message?.from?.id ?? '0'),
    });

    const limiter = new TokenBucketRateLimiter({ capacity: 1000, refillPerSecond: 1000 });
    const queue = new BoundedConcurrencyQueue(20, 2000);

    const tenantA = Array.from({ length: 200 }, (_, i) => makeUpdate(i + 1, 1001, 'A'));
    const tenantB = Array.from({ length: 200 }, (_, i) => makeUpdate(i + 1000, 2001, 'B'));
    const all = [...tenantA, ...tenantB];

    await Promise.all(
      all.map(async (u) => {
        const tenant = u.message.from.id < 2000 ? 'tenantA' : 'tenantB';
        if (!limiter.allow(tenant)) {
          return;
        }
        await queue.run(async () => {
          await kernel.handleUpdate(u);
        });
      }),
    );

    const userA = await storage.get('1001');
    const userB = await storage.get('2001');
    const processed = Number(userA?.data.count ?? 0) + Number(userB?.data.count ?? 0);
    const attempted = all.length;
    const queueOverflows = metrics.getCounter('runtime_dropped_queue_overflow');
    const conflicts = metrics.getCounter('session_conflict_count');
    const overflowRatio = queueOverflows / attempted;
    const conflictsPerUpdate = conflicts / attempted;

    expect(userA?.data.count).toBe(200);
    expect(userB?.data.count).toBe(200);
    expect(processed).toBe(attempted);
    expect(overflowRatio).toBeLessThanOrEqual(maxQueueOverflowRatio);
    expect(conflictsPerUpdate).toBeLessThanOrEqual(maxConflictsPerUpdate);
  });
});
