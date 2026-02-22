import { describe, expect, it } from 'vitest';
import { createBotClient } from '../src/core/bot-client.js';
import { createMessageUpdate } from '../src/testkit/update-factory.js';

describe('createBotClient', () => {
  it('dispatches message events in webhook mode', async () => {
    const bot = createBotClient({ token: 'test', mode: 'webhook' });
    const messages: string[] = [];

    const unsubscribe = bot.on('message', async (message) => {
      if ('text' in message && typeof message.text === 'string') {
        messages.push(message.text);
      }
    });

    const running = bot.start();
    bot.ingest(createMessageUpdate({ text: 'hello' }));
    await new Promise((resolve) => setTimeout(resolve, 30));
    await bot.stop();
    await running;
    unsubscribe();

    expect(messages).toEqual(['hello']);
  });
});
