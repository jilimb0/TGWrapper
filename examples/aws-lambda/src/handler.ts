import {
  ApiClient,
  AwsLambdaHandler,
  BotKernel,
  Context,
  MemorySessionStorage,
  SessionManager,
  TreeRouter,
  WebhookHandler
} from '@tgwrapper/core';
import type { ApiGatewayV2Event, ApiGatewayV2Response, SessionEnvelope } from '@tgwrapper/core';

type State = 'idle';
interface Data {
  count?: number;
}

const token = process.env.BOT_TOKEN;
const secret = process.env.WEBHOOK_SECRET;
if (!token || !secret) {
  throw new Error('BOT_TOKEN and WEBHOOK_SECRET are required');
}

const api = new ApiClient({ token });
const storage = new MemorySessionStorage<SessionEnvelope<State, Data>>();
const sessions = new SessionManager<State, Data>({ storage, initialData: () => ({ count: 0 }) });
const router = new TreeRouter<Context<State, Data>>();
router.use(async (ctx) => {
  const current = Number(ctx.session.data.count ?? 0) + 1;
  ctx.session.data.count = current;
  await ctx.reply(`messages: ${current}`);
});

const kernel = new BotKernel<State, Data>({
  apiClient: api,
  sessionManager: sessions,
  router,
  resolveSessionKey: (u) => String(u.message?.from?.id ?? u.callback_query?.from?.id ?? '')
});

const handler = new AwsLambdaHandler(new WebhookHandler(kernel, { secretToken: secret }));

export async function webhook(event: ApiGatewayV2Event): Promise<ApiGatewayV2Response> {
  return handler.handle(event);
}
