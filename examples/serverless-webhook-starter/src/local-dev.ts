import { createBotClient } from '@jilimb0/tgwrapper';

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'webhook' });
await bot.start();

export async function handleWebhook(update: unknown): Promise<void> {
  bot.ingest(update);
}

console.log('webhook starter loaded');
