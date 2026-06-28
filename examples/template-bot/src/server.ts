import { createServer } from 'node:http';
import type { SessionEnvelope } from '@tgwrapper/core';
import {
  ApiClient,
  BotKernel,
  type Context,
  MemorySessionStorage,
  NodeHttpHandler,
  SessionManager,
  TreeRouter,
  WebhookHandler,
} from '@tgwrapper/core';

type State = 'idle' | 'await_name';
interface Data {
  name?: string;
}

const token = process.env.BOT_TOKEN;
const secret = process.env.WEBHOOK_SECRET;
const port = Number(process.env.PORT ?? '3000');

if (!token || !secret) {
  throw new Error('BOT_TOKEN and WEBHOOK_SECRET are required');
}

const apiClient = new ApiClient({ token });
const storage = new MemorySessionStorage<SessionEnvelope<State, Data>>();
const sessionManager = new SessionManager<State, Data>({
  storage,
  initialData: () => ({}),
});

const router = new TreeRouter<Context<State, Data>>();

router.command('/start', async (ctx) => {
  await ctx.scene.enter('idle');
  await ctx.reply('Webhook template bot is online.');
});

router.command('/name', async (ctx) => {
  await ctx.scene.enter('await_name');
  await ctx.reply('Send me your name.');
});

router.state('await_name', async (ctx) => {
  const name = ctx.message?.text?.trim();
  if (!name) {
    await ctx.reply('I need text.');
    return;
  }

  ctx.session.data.name = name;
  await ctx.scene.enter('idle');
  await ctx.reply(`Saved: ${name}`);
});

router.use(async (ctx) => {
  await ctx.reply(`Current name: ${ctx.session.data.name ?? 'not set'}`);
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
    await_name: ['idle'],
  },
});

const handler = new NodeHttpHandler(new WebhookHandler(kernel, { secretToken: secret }));

createServer((req, res) => {
  void handler.handle(req, res);
}).listen(port, () => {
  console.log(`Template webhook bot listening on :${port}`);
});
