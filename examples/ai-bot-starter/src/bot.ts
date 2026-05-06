import { createBotClient } from '@jilimb0/tgwrapper';

async function askModel(input: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return `echo-fallback: ${input}`;
  }
  return `ai-placeholder: ${input}`;
}

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'polling' });

bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') return;
  const reply = await askModel(message.text);
  await bot.sendMessage(message.chat.id, reply);
});

await bot.start();
