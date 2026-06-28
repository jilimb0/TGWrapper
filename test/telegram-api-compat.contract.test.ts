import { describe, expect, it } from 'vitest';
import { ApiClient } from '../src/core/api-client.js';
import { Context } from '../src/core/context.js';
import type { ApiMethods, Update } from '../src/types/telegram.js';
import { isValidTelegramUpdate } from '../src/update-loop/update-validator.js';

describe('Telegram API compatibility contract', () => {
  it('accepts Update payloads with newer Bot API fields', () => {
    const update = {
      update_id: 100,
      business_connection: {
        id: 'bc_1',
        user: { id: 501, is_bot: false, first_name: 'Owner' },
        user_chat_id: 777,
        date: Math.floor(Date.now() / 1000),
        can_reply: true,
        is_enabled: true,
      },
      business_message: {
        message_id: 1,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 42, type: 'private' },
        from: { id: 42, is_bot: false, first_name: 'Alice' },
        text: 'hello from business',
      },
      deleted_business_messages: {
        business_connection_id: 'bc_1',
        chat: { id: 42, type: 'private' },
        message_ids: [1],
      },
      message_reaction: {
        chat: { id: 42, type: 'private' },
        message_id: 1,
        date: Math.floor(Date.now() / 1000),
        old_reaction: [],
        new_reaction: [],
      },
      purchased_paid_media: {
        from: { id: 42, is_bot: false, first_name: 'Alice' },
        paid_media_payload: 'media-token-v2',
      },
      guest_message: {
        message_id: 2,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 42, type: 'private' },
        from: { id: 42, is_bot: false, first_name: 'Alice' },
        guest_query_id: 'gq_2',
        guest_bot_caller_user: { id: 100, is_bot: true, first_name: 'caller' },
      },
    } as unknown;

    expect(isValidTelegramUpdate(update)).toBe(true);
  });

  it('keeps unknown fields as pass-through in context.update', async () => {
    const update = {
      update_id: 200,
      message: {
        message_id: 10,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 99, type: 'private' },
        from: { id: 99, is_bot: false, first_name: 'Bob' },
        text: '/start',
      },
      x_future_field: {
        nested: true,
      },
    } as Update;

    const ctx = new Context({
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
        mockResponder: async () => ({ ok: true }),
      }),
    });

    const passthrough = (ctx.update as Record<string, unknown>).x_future_field as
      | { nested: boolean }
      | undefined;
    expect(passthrough?.nested).toBe(true);
  });

  it('supports calling recently added API methods without runtime regression', async () => {
    const calls: string[] = [];
    const client = new ApiClient({
      token: 'TEST_TOKEN',
      mockResponder: async (method) => {
        calls.push(method);
        return { ok: true };
      },
    });

    const method: keyof ApiMethods = 'sendMessageDraft';
    await client.callApi(method, { chat_id: 1, message_thread_id: 1, text: 'compat-draft' });

    expect(calls).toContain('sendMessageDraft');
  });

  it('supports newer moderation/account methods through typed callApi', async () => {
    const calls: string[] = [];
    const client = new ApiClient({
      token: 'TEST_TOKEN',
      mockResponder: async (method) => {
        calls.push(method);
        return { ok: true };
      },
    });

    const method: keyof ApiMethods = 'verifyUser';
    await client.callApi(method, { user_id: 1, custom_description: 'compat-check' });

    expect(calls).toContain('verifyUser');
  });

  it('supports calling guest-query response method', async () => {
    const calls: string[] = [];
    const client = new ApiClient({
      token: 'TEST_TOKEN',
      mockResponder: async (method) => {
        calls.push(method);
        return { ok: true };
      },
    });

    const method: keyof ApiMethods = 'answerGuestQuery';
    await client.callApi(method, { guest_query_id: 'gq_2', text: 'ack' });

    expect(calls).toContain('answerGuestQuery');
  });
});
