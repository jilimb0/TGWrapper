import { describe, expect, it, vi } from 'vitest';
import { DraftStreamSession } from '../src/runtime/draft-stream.js';
import type { ApiClient } from '../src/core/api-client.js';

describe('DraftStreamSession', () => {
  it('sends thinking draft placeholder with empty text', async () => {
    const calls: Array<{ method: string; payload: unknown }> = [];
    const mockApiClient = {
      callApiUnsafe: vi.fn(async (method: string, payload: unknown) => {
        calls.push({ method, payload });
        return true;
      }),
    } as unknown as ApiClient;

    const stream = new DraftStreamSession(mockApiClient, {
      chatId: 12345,
      draftId: 999,
      canStop: true,
    });

    await stream.thinking();

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      method: 'sendMessageDraft',
      payload: {
        chat_id: 12345,
        draft_id: 999,
        can_stop: true,
        keep_on_stop: false,
        text: '',
      },
    });
  });

  it('completes by sending final persisted message with sendMessage', async () => {
    const calls: Array<{ method: string; payload: unknown }> = [];
    const mockApiClient = {
      callApiUnsafe: vi.fn(async (method: string, payload: unknown) => {
        calls.push({ method, payload });
        if (method === 'sendMessage') {
          return { message_id: 42, text: (payload as { text: string }).text };
        }
        return true;
      }),
    } as unknown as ApiClient;

    const stream = new DraftStreamSession(mockApiClient, {
      chatId: 12345,
      minIntervalMs: 10,
    });

    await stream.write('Hello ');
    await stream.write('World!');

    const result = await stream.complete();

    expect(result).toMatchObject({
      message_id: 42,
      text: 'Hello World!',
    });

    const finalCall = calls[calls.length - 1];
    expect(finalCall?.method).toBe('sendMessage');
    expect(finalCall?.payload).toMatchObject({
      chat_id: 12345,
      text: 'Hello World!',
    });
  });

  it('supports pipeFrom async iterable source', async () => {
    const mockApiClient = {
      callApiUnsafe: vi.fn(async (method: string, payload: unknown) => {
        if (method === 'sendMessage') {
          return { message_id: 100, text: (payload as { text: string }).text };
        }
        return true;
      }),
    } as unknown as ApiClient;

    async function* generateTokens() {
      yield 'Thinking ';
      yield 'step ';
      yield 'by ';
      yield 'step.';
    }

    const stream = new DraftStreamSession(mockApiClient, { chatId: 555 });
    const finalMsg = await stream.pipeFrom(generateTokens());

    expect(finalMsg).toMatchObject({
      message_id: 100,
      text: 'Thinking step by step.',
    });
  });
});
