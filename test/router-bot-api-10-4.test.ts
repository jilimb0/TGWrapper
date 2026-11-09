import { describe, expect, it } from 'vitest';
import { ApiClient } from '../src/core/api-client.js';
import { BotKernel } from '../src/core/bot-kernel.js';
import { TreeRouter } from '../src/router/router.js';
import { MemorySessionStorage } from '../src/storage/memory-session-storage.js';
import { SessionManager } from '../src/fsm/session-manager.js';
import {
  createSharedWidgetQueryUpdate,
  createTonTransferUpdate,
  createWidgetQueryUpdate,
} from '../src/testkit/update-factory.js';
import type { Context } from '../src/core/context.js';

type State = 'idle';
type Data = Record<string, unknown>;

function setupTestEnvironment() {
  const calls: Array<{ method: string; payload: unknown }> = [];
  const apiClient = new ApiClient({
    token: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
    mockResponder: async (method, payload) => {
      calls.push({ method, payload });
      return { ok: true, result: true };
    },
  });

  const storage = new MemorySessionStorage<{
    current_state: State | null;
    data: Data;
    version: number;
    encrypted: boolean;
    updated_at: string;
  }>();

  const sessionManager = new SessionManager<State, Data>({
    storage,
    initialData: () => ({}),
  });

  const router = new TreeRouter<Context<State, Data>>();

  const kernel = new BotKernel<State, Data>({
    apiClient,
    sessionManager,
    router,
    resolveSessionKey: (update) => {
      const userId =
        update.widget_query?.from?.id ??
        update.shared_widget_query?.from?.id ??
        update.message?.from?.id;
      return userId ? `user:${userId}` : null;
    },
  });

  return { kernel, router, calls };
}

describe('Bot API 10.4 Router & Context Integration', () => {
  it('routes widget_query updates and answers them', async () => {
    const { kernel, router, calls } = setupTestEnvironment();
    let handled = false;

    router.widgetQuery(async (ctx) => {
      handled = true;
      expect(ctx.widgetQuery).toBeDefined();
      expect(ctx.widgetQuery?.data).toBe('click_btn');
      await ctx.answerWidgetQuery('received_ok');
    });

    const update = createWidgetQueryUpdate({
      updateId: 101,
      userId: 555,
      chatId: 777,
      data: 'click_btn',
    });

    await kernel.handleUpdate(update);

    expect(handled).toBe(true);
    expect(calls.some((c) => c.method === 'answerWidgetQuery' && (c.payload as Record<string, unknown>).data === 'received_ok')).toBe(true);
  });

  it('routes shared_widget_query updates and edits message widget data', async () => {
    const { kernel, router, calls } = setupTestEnvironment();
    let handled = false;

    router.sharedWidgetQuery(async (ctx) => {
      handled = true;
      expect(ctx.sharedWidgetQuery).toBeDefined();
      expect(ctx.sharedWidgetQuery?.widget_id).toBe('sw_xyz');
      await ctx.editSharedWidget('sw_xyz', 'public_state_updated', 60);
    });

    const update = createSharedWidgetQueryUpdate({
      updateId: 102,
      userId: 888,
      widgetId: 'sw_xyz',
      data: 'refresh',
    });

    await kernel.handleUpdate(update);

    expect(handled).toBe(true);
    expect(
      calls.some(
        (c) =>
          c.method === 'editSharedWidgetData' &&
          (c.payload as Record<string, unknown>).widget_id === 'sw_xyz' &&
          (c.payload as Record<string, unknown>).public_data === 'public_state_updated',
      ),
    ).toBe(true);
  });

  it('sends native widgets via replyWidget', async () => {
    const { kernel, router, calls } = setupTestEnvironment();

    router.widgetQuery(async (ctx) => {
      await ctx.replyWidget({
        html: '<div class="widget">Widget Body</div>',
        width: 300,
        height: 200,
        allowQueries: true,
      });
    });

    const update = createWidgetQueryUpdate({ updateId: 103, userId: 111, chatId: 222 });
    await kernel.handleUpdate(update);

    expect(
      calls.some(
        (c) =>
          c.method === 'sendWidget' &&
          (c.payload as Record<string, unknown>).chat_id === 222 &&
          (c.payload as Record<string, unknown>).width === 300,
      ),
    ).toBe(true);
  });

  it('sends ephemeral replies with callback_query_id without requiring receiverUserId', async () => {
    const { kernel, router, calls } = setupTestEnvironment();

    router.use(async (ctx) => {
      await ctx.replyEphemeral('Hidden alert message', {
        callbackQueryId: 'cb_query_999',
        replaceCallbackQueryMessage: true,
      });
    });

    const update = createWidgetQueryUpdate({ updateId: 104, userId: 333, chatId: 444 });
    await kernel.handleUpdate(update);

    const call = calls.find((c) => c.method === 'sendMessage');
    expect(call).toBeDefined();
    const payload = call?.payload as Record<string, unknown>;
    const eph = payload.ephemeral_message_parameters as Record<string, unknown>;
    expect(eph.callback_query_id).toBe('cb_query_999');
    expect(eph.replace_callback_query_message).toBe(true);
  });

  it('correctly processes TON transfer service messages', async () => {
    const { kernel, router } = setupTestEnvironment();
    let handled = false;

    router.use(async (ctx) => {
      const msg = ctx.anyMessage;
      if (msg?.ton_wallet_transfer) {
        handled = true;
        expect(msg.ton_wallet_transfer.amount).toBe('2500000000');
        expect(msg.ton_wallet_transfer.transaction_id).toBe('tx_ton_123');
      }
    });

    const update = createTonTransferUpdate({
      updateId: 105,
      userId: 777,
      chatId: 777,
      amount: '2500000000',
      transactionId: 'tx_ton_123',
    });

    await kernel.handleUpdate(update);
    expect(handled).toBe(true);
  });
});
