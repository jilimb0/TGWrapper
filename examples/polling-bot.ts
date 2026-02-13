import {
  ApiClient,
  BotKernel,
  BotRuntime,
  Context,
  MemorySessionStorage,
  PollingSource,
  SessionManager,
  TreeRouter
} from '../src/index.js';
import type { SessionEnvelope } from '../src/types/core.js';

type AppState = 'await_name' | 'done';
interface AppSessionData {
  name?: string;
}

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error('BOT_TOKEN is required');
}

const apiClient = new ApiClient({ token });
const storage = new MemorySessionStorage<SessionEnvelope<AppState, AppSessionData>>();
const sessionManager = new SessionManager<AppState, AppSessionData>({
  storage,
  initialData: () => ({}),
  encryptionRequired: false
});

const router = new TreeRouter<Context<AppState, AppSessionData>>();
router.command('/start', async (ctx) => {
  await ctx.scene.enter('await_name');
  await ctx.reply('Hi. What is your name?');
});

router.state('await_name', async (ctx) => {
  const input = ctx.message?.text;
  if (!input) {
    await ctx.reply('Please send text.');
    return;
  }

  ctx.session.data.name = input;
  await ctx.scene.enter('done');
  await ctx.reply(`Nice to meet you, ${input}`);
});

router.use(async (ctx) => {
  await ctx.reply('Use /start');
});

const kernel = new BotKernel<AppState, AppSessionData>({
  apiClient,
  router,
  sessionManager,
  resolveSessionKey: (update) => {
    const id = update.message?.from?.id ?? update.callback_query?.from?.id;
    return id ? String(id) : null;
  },
  transitions: {
    await_name: ['done'],
    done: ['await_name']
  }
});

const source = new PollingSource(apiClient, {
  dropPendingUpdates: true,
  timeoutSeconds: 25
});

const runtime = new BotRuntime(source, kernel);

process.on('SIGINT', async () => {
  await runtime.shutdown();
  process.exit(0);
});

await runtime.start();
