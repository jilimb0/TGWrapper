import { describe, expect, it } from 'vitest';
import { MockApiClient, createCallbackUpdate, createMessageUpdate } from '../src/index.js';

describe('testkit', () => {
  it('records api calls in MockApiClient', async () => {
    const mock = new MockApiClient();
    await mock.callApi('sendMessage', { chat_id: 1, text: 'hello' });
    expect(mock.calls.length).toBe(1);
    expect(mock.lastCall()?.method).toBe('sendMessage');
  });

  it('creates update fixtures', () => {
    const messageUpdate = createMessageUpdate({ text: 'x' });
    const callbackUpdate = createCallbackUpdate({ data: 'cb' });

    expect(messageUpdate.message?.text).toBe('x');
    expect(callbackUpdate.callback_query?.data).toBe('cb');
  });
});
