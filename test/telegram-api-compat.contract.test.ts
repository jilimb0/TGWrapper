import { describe, expect, it } from 'vitest';
import { ApiClient } from '../src/core/api-client.js';
import { Context } from '../src/core/context.js';
import { isValidTelegramUpdate } from '../src/update-loop/update-validator.js';
import type { ApiMethods, Update } from '../src/types/telegram.js';

describe('Telegram API compatibility contract', () => {
  it('accepts Update payloads with newer Bot API fields', () => {
    const update = {
      update_id: 100,
      business_message: {
        message_id: 1,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 42, type: 'private' },
        from: { id: 42, is_bot: false, first_name: 'Alice' },
        text: 'hello from business'
      },
      message_reaction: {
        chat: { id: 42, type: 'private' },
        message_id: 1,
        date: Math.floor(Date.now() / 1000),
        old_reaction: [],
        new_reaction: []
      }
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
        text: '/start'
      },
      x_future_field: {
        nested: true
      }
    } as Update;

    const ctx = new Context({
      update,
      session: {
        current_state: null,
        data: { seen: 0 },
        version: 0,
        encrypted: false,
        updated_at: new Date().toISOString()
      },
      sceneController: {
        enter: async () => undefined,
        leave: async () => undefined
      },
      apiClient: new ApiClient({
        token: 'TEST_TOKEN',
        mockResponder: async () => ({ ok: true })
      })
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
      }
    });

    const method: keyof ApiMethods<unknown> = 'sendMessageDraft';
    await client.callApi(method, { chat_id: 1, message_thread_id: 1, text: 'compat-draft' });

    expect(calls).toContain('sendMessageDraft');
  });
});
