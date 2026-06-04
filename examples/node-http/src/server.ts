import { createServer } from 'node:http';
import {
  ApiClient,
  BotKernel,
  Context,
  MemorySessionStorage,
  NodeHttpHandler,
  SessionManager,
  TreeRouter,
  WebhookHandler
} from '@tgwrapper/core';
import type { SessionEnvelope } from '@tgwrapper/core';

type State = 'idle';
interface Data {
  lastMessage?: string;
}

const token = process.env.BOT_TOKEN;
const secret = process.env.WEBHOOK_SECRET;
const port = Number(process.env.PORT ?? '3000');
if (!token || !secret) {
  throw new Error('BOT_TOKEN and WEBHOOK_SECRET are required');
}

const api = new ApiClient({ token });
const storage = new MemorySessionStorage<SessionEnvelope<State, Data>>();
const sessions = new SessionManager<State, Data>({ storage, initialData: () => ({}) });
const router = new TreeRouter<Context<State, Data>>();

router.use(async (ctx) => {
  const text = ctx.message?.text ?? 'empty';
  ctx.session.data.lastMessage = text;
  await ctx.reply(`echo: ${text}`);
});

const kernel = new BotKernel<State, Data>({
  apiClient: api,
  sessionManager: sessions,
  router,
  resolveSessionKey: (u) => String(u.message?.from?.id ?? u.callback_query?.from?.id ?? '')
});

const webhook = new WebhookHandler(kernel, { secretToken: secret });
const nodeHandler = new NodeHttpHandler(webhook);

createServer((req, res) => {
  void nodeHandler.handle(req, res);
}).listen(port);
