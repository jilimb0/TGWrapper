import { describe, expect, it } from 'vitest';
import {
  ApiClient,
  BotKernel,
  Context,
  MemorySessionStorage,
  NodeHttpHandler,
  SessionManager,
  TreeRouter,
  WebhookHandler
} from '../src/index.js';
import type { SessionEnvelope } from '../src/types/core.js';

type State = 'idle';
interface Data {
  hits?: number;
}

class MockReq {
  public method = 'POST';
  public headers: Record<string, string>;
  private readonly body: string;

  public constructor(body: string, secret: string) {
    this.body = body;
    this.headers = {
      'x-telegram-bot-api-secret-token': secret
    };
  }

  public on(event: 'data' | 'end' | 'error', cb: (value?: unknown) => void): void {
    if (event === 'data') {
      cb(this.body);
      return;
    }
    if (event === 'end') {
      cb();
    }
  }
}

class MockRes {
  public statusCode = 0;
  public headers = new Map<string, string>();
  public body = '';

  public setHeader(name: string, value: string): void {
    this.headers.set(name, value);
  }

  public end(body?: string): void {
    this.body = body ?? '';
  }
}

describe('Webhook E2E', () => {
  it('runs full webhook lifecycle and calls API', async () => {
    const calls: string[] = [];
    const api = new ApiClient({
      token: 'TEST',
      mockResponder: async (method) => {
        calls.push(method);
        return { ok: true };
      }
    });

    const storage = new MemorySessionStorage<SessionEnvelope<State, Data>>();
    const sessions = new SessionManager<State, Data>({
      storage,
      initialData: () => ({ hits: 0 })
    });

    const router = new TreeRouter<Context<State, Data>>();
    router.use(async (ctx) => {
      ctx.session.data.hits = Number(ctx.session.data.hits ?? 0) + 1;
      await ctx.reply('ok');
    });

    const kernel = new BotKernel<State, Data>({
      apiClient: api,
      sessionManager: sessions,
      router,
      resolveSessionKey: (u) => String(u.message?.from?.id ?? '')
    });

    const webhook = new WebhookHandler(kernel, { secretToken: 'secret' });
    const nodeHandler = new NodeHttpHandler(webhook);

    const req = new MockReq(
      JSON.stringify({
        update_id: 1,
        message: {
          message_id: 1,
          date: Math.floor(Date.now() / 1000),
          chat: { id: 1, type: 'private' },
          from: { id: 5, is_bot: false, first_name: 'u' },
          text: 'hello'
        }
      }),
      'secret'
    );
    const res = new MockRes();

    await nodeHandler.handle(req, res);

    expect(res.statusCode).toBe(200);
    expect(calls).toContain('sendMessage');
    const session = await storage.get('5');
    expect(session?.data.hits).toBe(1);
  });
});
