import { describe, expect, it } from 'vitest';
import { ApiClient } from '../src/core/api-client.js';
import { Context } from '../src/core/context.js';
import type { Update } from '../src/types/telegram.js';

function makeContext(
  update: Update,
  calls: Array<{ method: string; payload: Record<string, unknown> }>,
) {
  return new Context({
    update,
    session: {
      current_state: null,
      data: { seen: 0 },
      version: 0,
      encrypted: false,
      updated_at: new Date().toISOString(),
    },
    sceneController: {
      enter: async () => undefined,
      leave: async () => undefined,
    },
    apiClient: new ApiClient({
      token: 'TEST_TOKEN',
      mockResponder: async (method, payload) => {
        calls.push({ method, payload: payload as Record<string, unknown> });
        return { ok: true };
      },
    }),
  });
}

describe('Context compatibility fallbacks', () => {
  it('resolves chat_id for reply from chat_member updates', async () => {
    const calls: Array<{ method: string; payload: Record<string, unknown> }> = [];
    const update = {
      update_id: 1,
      chat_member: {
        chat: { id: 555, type: 'supergroup', title: 'x' },
        from: { id: 77, is_bot: false, first_name: 'A' },
        date: 1,
        old_chat_member: { status: 'member', user: { id: 12, is_bot: false, first_name: 'u' } },
        new_chat_member: { status: 'member', user: { id: 12, is_bot: false, first_name: 'u' } },
      },
    } as unknown as Update;

    const ctx = makeContext(update, calls);
    await ctx.reply('hello');

    expect(ctx.chatId).toBe(555);
    expect(calls.at(0)?.method).toBe('sendMessage');
    expect(calls.at(0)?.payload.chat_id).toBe(555);
  });

  it('edits primary message when callback_query.message is absent', async () => {
    const calls: Array<{ method: string; payload: Record<string, unknown> }> = [];
    const update = {
      update_id: 2,
      edited_message: {
        message_id: 22,
        date: 1,
        edit_date: 2,
        chat: { id: 999, type: 'private', first_name: 'u' },
        from: { id: 42, is_bot: false, first_name: 'U' },
        text: 'old',
      },
    } as unknown as Update;

    const ctx = makeContext(update, calls);
    await ctx.editMessage('new');

    expect(calls.at(0)?.method).toBe('editMessageText');
    expect(calls.at(0)?.payload.chat_id).toBe(999);
    expect(calls.at(0)?.payload.message_id).toBe(22);
  });

  it('resolves fromId from inline_query updates', () => {
    const update = {
      update_id: 3,
      inline_query: {
        id: 'iq',
        from: { id: 700, is_bot: false, first_name: 'inline' },
        query: 'q',
        offset: '',
      },
    } as unknown as Update;

    const ctx = makeContext(update, []);
    expect(ctx.fromId).toBe(700);
  });

  it('resolves fromId from business_connection updates', () => {
    const update = {
      update_id: 4,
      business_connection: {
        id: 'bc_1',
        user: { id: 901, is_bot: false, first_name: 'biz-owner' },
        user_chat_id: 42,
        date: 1,
        can_reply: true,
        is_enabled: true,
      },
    } as unknown as Update;

    const ctx = makeContext(update, []);
    expect(ctx.fromId).toBe(901);
  });

  it('resolves fromId from purchased_paid_media updates', () => {
    const update = {
      update_id: 44,
      purchased_paid_media: {
        from: { id: 1001, is_bot: false, first_name: 'payer' },
        paid_media_payload: 'payload-v2',
      },
    } as unknown as Update;

    const ctx = makeContext(update, []);
    expect(ctx.fromId).toBe(1001);
  });

  it('resolves chat_id from deleted_business_messages updates', async () => {
    const calls: Array<{ method: string; payload: Record<string, unknown> }> = [];
    const update = {
      update_id: 5,
      deleted_business_messages: {
        business_connection_id: 'bc_2',
        chat: { id: 707, type: 'private', first_name: 'biz-chat' },
        message_ids: [1, 2],
      },
    } as unknown as Update;

    const ctx = makeContext(update, calls);
    await ctx.reply('restored');

    expect(ctx.chatId).toBe(707);
    expect(calls.at(0)?.method).toBe('sendMessage');
    expect(calls.at(0)?.payload.chat_id).toBe(707);
  });

  it('treats guest_message as primary message for fromId/chatId/reply', async () => {
    const calls: Array<{ method: string; payload: Record<string, unknown> }> = [];
    const update = {
      update_id: 6,
      guest_message: {
        message_id: 700,
        date: 1,
        chat: { id: 909, type: 'private' },
        from: { id: 111, is_bot: false, first_name: 'guest' },
        guest_query_id: 'gq_6',
      },
    } as unknown as Update;

    const ctx = makeContext(update, calls);
    expect(ctx.fromId).toBe(111);
    expect(ctx.chatId).toBe(909);

    await ctx.reply('guest-reply');
    expect(calls.at(0)?.method).toBe('sendMessage');
    expect(calls.at(0)?.payload.chat_id).toBe(909);
  });
});
