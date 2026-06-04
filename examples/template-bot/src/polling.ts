import {
  ApiClient,
  BotKernel,
  BotRuntime,
  Context,
  MemorySessionStorage,
  PollingSource,
  SessionManager,
  TreeRouter
} from '@tgwrapper/core';
import type { SessionEnvelope } from '@tgwrapper/core';

type State = 'idle' | 'await_name';
interface Data {
  name?: string;
}

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error('BOT_TOKEN is required');
}

const apiClient = new ApiClient({ token });
const storage = new MemorySessionStorage<SessionEnvelope<State, Data>>();
const sessionManager = new SessionManager<State, Data>({
  storage,
  initialData: () => ({})
});

const router = new TreeRouter<Context<State, Data>>();

router.command('/start', async (ctx) => {
  await ctx.scene.enter('idle');
  await ctx.reply('Template bot is online. Use /name or click the button.', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Set name', callback_data: 'set_name' }],
        [{ text: 'Who am I?', callback_data: 'whoami' }]
      ]
    }
  });
});

router.command('/name', async (ctx) => {
  await ctx.scene.enter('await_name');
  await ctx.reply('Send me your name as text.');
});

router.callback('set_name', async (ctx) => {
  await ctx.answerCallbackQuery('Send your name in next message');
  await ctx.scene.enter('await_name');
  await ctx.editMessage('State switched to await_name. Send text with your name.');
});

router.callback('whoami', async (ctx) => {
  const name = ctx.session.data.name ?? 'unknown';
  await ctx.answerCallbackQuery(`Current name: ${name}`);
});

router.state('await_name', async (ctx) => {
  const name = ctx.message?.text?.trim();
  if (!name) {
    await ctx.reply('I need text. Try again.');
    return;
  }

  ctx.session.data.name = name;
  await ctx.scene.enter('idle');
  await ctx.reply(`Saved. Hello, ${name}.`);
});

router.use(async (ctx) => {
  await ctx.reply('Use /start');
});

const kernel = new BotKernel<State, Data>({
  apiClient,
  sessionManager,
  router,
  resolveSessionKey: (update) => {
    const id = update.message?.from?.id ?? update.callback_query?.from?.id;
    return id ? String(id) : null;
  },
  transitions: {
    idle: ['await_name'],
    await_name: ['idle']
  }
});

const runtime = new BotRuntime(
  new PollingSource(apiClient, {
    dropPendingUpdates: true,
    timeoutSeconds: 25
  }),
  kernel
);

process.on('SIGINT', async () => {
  await runtime.shutdown();
  process.exit(0);
});

await runtime.start();
