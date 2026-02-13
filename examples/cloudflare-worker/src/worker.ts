import {
  ApiClient,
  BotKernel,
  CloudflareWorkerHandler,
  Context,
  MemorySessionStorage,
  SessionManager,
  TreeRouter,
  WebhookHandler
} from '@framework/core';
import type { SessionEnvelope } from '@framework/core';

type State = 'idle';
interface Data {
  last?: string;
}

let cloudflareHandler: CloudflareWorkerHandler | null = null;

function getHandler(env: { BOT_TOKEN: string; WEBHOOK_SECRET: string }): CloudflareWorkerHandler {
  if (cloudflareHandler) {
    return cloudflareHandler;
  }

  const api = new ApiClient({ token: env.BOT_TOKEN });
  const storage = new MemorySessionStorage<SessionEnvelope<State, Data>>();
  const sessions = new SessionManager<State, Data>({ storage, initialData: () => ({}) });
  const router = new TreeRouter<Context<State, Data>>();

  router.use(async (ctx) => {
    const text = ctx.message?.text ?? '';
    ctx.session.data.last = text;
    await ctx.reply(`worker echo: ${text}`);
  });

  const kernel = new BotKernel<State, Data>({
    apiClient: api,
    sessionManager: sessions,
    router,
    resolveSessionKey: (u) => String(u.message?.from?.id ?? u.callback_query?.from?.id ?? '')
  });

  cloudflareHandler = new CloudflareWorkerHandler(new WebhookHandler(kernel, { secretToken: env.WEBHOOK_SECRET }));
  return cloudflareHandler;
}

export default {
  async fetch(request: Request, env: { BOT_TOKEN: string; WEBHOOK_SECRET: string }): Promise<Response> {
    return getHandler(env).handle(request);
  }
};
