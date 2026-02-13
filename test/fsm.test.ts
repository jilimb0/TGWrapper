import { describe, expect, it } from 'vitest';
import { ApiClient } from '../src/core/api-client.js';
import { BotKernel } from '../src/core/bot-kernel.js';
import { SessionConflictError } from '../src/core/errors.js';
import { SessionManager } from '../src/fsm/session-manager.js';
import { TreeRouter } from '../src/router/router.js';
import { MemorySessionStorage } from '../src/storage/memory-session-storage.js';
import type { SessionEnvelope } from '../src/types/core.js';
import type { Update } from '../src/types/telegram.js';

interface SessionData {
  step?: string;
}

type States = 'idle' | 'collect_name';

describe('FSM kernel', () => {
  it('enters state and persists session with version increment', async () => {
    const storage = new MemorySessionStorage<SessionEnvelope<States, SessionData>>();
    const sessionManager = new SessionManager<States, SessionData>({
      storage,
      initialData: () => ({})
    });

    const router = new TreeRouter<{
      scene: { enter(nextState: States): Promise<void> };
      session: SessionEnvelope<States, SessionData>;
    }>();
    router.command('/start', async (ctx) => {
      await ctx.scene.enter('collect_name');
      ctx.session.data.step = 'started';
    });

    const apiClient = new ApiClient({
      token: 'TEST',
      mockResponder: async () => ({ ok: true })
    });

    const kernel = new BotKernel<States, SessionData>({
      apiClient,
      router,
      sessionManager,
      resolveSessionKey: (update) => String(update.message?.from?.id ?? '')
    });

    const update: Update = {
      update_id: 1,
      message: {
        message_id: 1,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 1, type: 'private' },
        from: { id: 42, is_bot: false, first_name: 'u' },
        text: '/start',
        entities: [{ type: 'bot_command', offset: 0, length: 6 }]
      }
    };
    await kernel.handleUpdate(update);

    const saved = await storage.get('42');
    expect(saved?.current_state).toBe('collect_name');
    expect(saved?.data.step).toBe('started');
    expect(saved?.version).toBe(2);
    expect(typeof saved?.updated_at).toBe('string');
  });

  it('throws conflict after repeated CAS mismatch', async () => {
    const storage = new MemorySessionStorage<SessionEnvelope<States, SessionData>>();
    const sessionManager = new SessionManager<States, SessionData>({
      storage,
      initialData: () => ({}),
      conflictRetries: 1
    });

    const load = await sessionManager.load('42');
    await storage.compareAndSet('42', load.version, {
      ...load.value,
      version: load.version + 1,
      updated_at: new Date().toISOString()
    });

    await expect(
      sessionManager.runInSession('42', async (session) => {
        session.data.step = 'conflict';
        await storage.set('42', {
          ...session,
          version: session.version + 10,
          updated_at: new Date().toISOString()
        });
      })
    ).rejects.toBeInstanceOf(SessionConflictError);
  });
});
