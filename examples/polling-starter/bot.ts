import { createBotClient } from '@jilimb0/tgwrapper';

const bot = createBotClient({
  token: process.env.BOT_TOKEN!,
  mode: 'polling',
  polling: { timeoutSeconds: 30, limit: 100 }
});

bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') return;
  if (message.text === '/start') {
    await bot.sendMessage(message.chat.id, 'polling-starter ready');
    return;
  }
  await bot.sendMessage(message.chat.id, `echo: ${message.text}`);
});

await bot.start();
