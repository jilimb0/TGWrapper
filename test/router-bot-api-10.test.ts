import { describe, expect, it, vi } from 'vitest';
import { TreeRouter } from '../src/router/router.js';
import { BotKernel } from '../src/core/bot-kernel.js';
import { SessionManager } from '../src/fsm/session-manager.js';
import { MemorySessionStorage } from '../src/storage/memory-session-storage.js';
import {
  createGuestMessageUpdate,
  createManagedBotUpdate,
  createStoppedDraftUpdate,
  createSubscriptionUpdate,
} from '../src/testkit/update-factory.js';
import type { ApiClient } from '../src/core/api-client.js';
import type { Context } from '../src/core/context.js';

describe('Router & BotKernel Telegram Bot API 10.x additions', () => {
  it('dispatches guestMessage and supports ephemeralGuestSessions', async () => {
    let handledGuest = false;
    let queryAnswered = false;

    const mockApiClient = {
      callApiUnsafe: vi.fn(async (method: string) => {
        if (method === 'answerGuestQuery') {
          queryAnswered = true;
          return { inline_message_id: 'guest_inline_msg_1' };
        }
        return true;
      }),
    } as unknown as ApiClient;

    const router = new TreeRouter<Context<string, Record<string, unknown>>>();
    router.guestMessage(async (ctx) => {
      handledGuest = true;
      expect(ctx.update.guest_message?.guest_query_id).toBe('guest-query-999');
      await ctx.answerGuestQuery({ type: 'article', id: 'res1', title: 'Answer' });
    });

    const storage = new MemorySessionStorage<string, Record<string, unknown>>();
    const sessionManager = new SessionManager({ storage });

    const kernel = new BotKernel({
      apiClient: mockApiClient,
      sessionManager,
      router,
      resolveSessionKey: (up) => (up.guest_message ? `guest:${up.guest_message.from?.id}` : null),
      ephemeralGuestSessions: true,
    });

    const update = createGuestMessageUpdate({
      userId: 777,
      chatId: -100123,
      guestQueryId: 'guest-query-999',
    });

    await kernel.handleUpdate(update);

    expect(handledGuest).toBe(true);
    expect(queryAnswered).toBe(true);
  });

  it('routes onUpdateType for managed_bot, subscription and stoppedDraft', async () => {
    const events: string[] = [];

    const mockApiClient = {} as unknown as ApiClient;
    const router = new TreeRouter<Context<string, Record<string, unknown>>>();

    router.stoppedDraft(async (ctx) => {
      events.push(`stopped:${ctx.stoppedDraft?.draft_id}`);
    });

    router.onUpdateType('subscription', async (ctx) => {
      events.push(`sub:${ctx.subscription?.state}`);
    });

    router.onUpdateType('managed_bot', async (ctx) => {
      events.push(`managed:${ctx.managedBot?.bot.username}`);
    });

    const sessionManager = new SessionManager({
      storage: new MemorySessionStorage(),
      initialData: () => ({}),
    });
    const kernel = new BotKernel({
      apiClient: mockApiClient,
      sessionManager,
      router,
      resolveSessionKey: () => 'global_test',
    });

    await kernel.handleUpdate(createStoppedDraftUpdate({ draftId: 7777 }));
    await kernel.handleUpdate(createSubscriptionUpdate({ state: 'active' }));
    await kernel.handleUpdate(createManagedBotUpdate({ botId: 888 }));

    expect(events).toEqual(['stopped:7777', 'sub:active', 'managed:child_bot']);
  });
});
