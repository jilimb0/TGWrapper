import { describe, expect, it } from 'vitest';
import { TreeRouter } from '../src/router/router.js';

interface TestContext {
  trace: string[];
  command?: string;
  text?: string;
  callbackData?: string;
  currentState?: string | null;
}

describe('Middleware chain', () => {
  describe('global middleware (useMiddleware)', () => {
    it('executes middleware before handler', async () => {
      const router = new TreeRouter<TestContext>();

      router.useMiddleware(async (ctx, next) => {
        ctx.trace.push('mw-before');
        await next();
        ctx.trace.push('mw-after');
      });

      router.command('/start', async (ctx) => {
        ctx.trace.push('handler');
      });

      const ctx: TestContext = { trace: [], command: '/start' };
      await router.dispatch(ctx);
      expect(ctx.trace).toEqual(['mw-before', 'handler', 'mw-after']);
    });

    it('runs multiple middlewares in priority order', async () => {
      const router = new TreeRouter<TestContext>();

      router.useMiddleware(async (ctx, next) => {
        ctx.trace.push('mw1');
        await next();
      }, 10);

      router.useMiddleware(async (ctx, next) => {
        ctx.trace.push('mw0');
        await next();
      }, 0);

      router.command('/start', async (ctx) => {
        ctx.trace.push('handler');
      });

      const ctx: TestContext = { trace: [], command: '/start' };
      await router.dispatch(ctx);
      expect(ctx.trace).toEqual(['mw1', 'mw0', 'handler']);
    });

    it('can halt pipeline by not calling next()', async () => {
      const router = new TreeRouter<TestContext>();

      router.useMiddleware(async (ctx, next) => {
        ctx.trace.push('mw-halt');
        // does NOT call next()
      });

      router.command('/start', async (ctx) => {
        ctx.trace.push('handler');
      });

      const ctx: TestContext = { trace: [], command: '/start' };
      const handled = await router.dispatch(ctx);
      expect(handled).toBe(true);
      expect(ctx.trace).toEqual(['mw-halt']);
    });
  });

  describe('per-route middleware', () => {
    it('executes route-level middleware before handler', async () => {
      const router = new TreeRouter<TestContext>();

      const authMw = async (ctx: TestContext, next: () => Promise<void>) => {
        ctx.trace.push('auth');
        await next();
      };

      router.command('/admin', [authMw], async (ctx) => {
        ctx.trace.push('admin-handler');
      });

      const ctx: TestContext = { trace: [], command: '/admin' };
      await router.dispatch(ctx);
      expect(ctx.trace).toEqual(['auth', 'admin-handler']);
    });

    it('route middleware combined with global middleware', async () => {
      const router = new TreeRouter<TestContext>();

      router.useMiddleware(async (ctx, next) => {
        ctx.trace.push('global');
        await next();
      });

      router.command('/data', [
        async (ctx, next) => {
          ctx.trace.push('route-mw');
          await next();
        },
      ], async (ctx) => {
        ctx.trace.push('handler');
      });

      const ctx: TestContext = { trace: [], command: '/data' };
      await router.dispatch(ctx);
      expect(ctx.trace).toEqual(['global', 'route-mw', 'handler']);
    });
  });

  describe('backward compatibility', () => {
    it('existing route registration without middleware still works', async () => {
      const router = new TreeRouter<TestContext>();

      router.command('/start', async (ctx) => {
        ctx.trace.push('start');
      });

      const ctx: TestContext = { trace: [], command: '/start' };
      const handled = await router.dispatch(ctx);
      expect(handled).toBe(true);
      expect(ctx.trace).toEqual(['start']);
    });

    it('use() without middleware works', async () => {
      const router = new TreeRouter<TestContext>();

      router.use(async (ctx) => {
        ctx.trace.push('fallback');
      });

      const ctx: TestContext = { trace: [] };
      const handled = await router.dispatch(ctx);
      expect(handled).toBe(true);
      expect(ctx.trace).toEqual(['fallback']);
    });

    it('regex/callbackData/state retain existing signatures', async () => {
      const router = new TreeRouter<TestContext>();

      router.regex(/hello/, async (ctx) => { ctx.trace.push('regex'); });
      router.callbackData(/data/, async (ctx) => { ctx.trace.push('cb'); });
      router.state('s1', async (ctx) => { ctx.trace.push('state'); });

      const ctx1: TestContext = { trace: [], text: 'hello' };
      await router.dispatch(ctx1);
      expect(ctx1.trace).toEqual(['regex']);

      const ctx2: TestContext = { trace: [], callbackData: 'data' };
      await router.dispatch(ctx2);
      expect(ctx2.trace).toEqual(['cb']);

      const ctx3: TestContext = { trace: [], currentState: 's1' };
      await router.dispatch(ctx3);
      expect(ctx3.trace).toEqual(['state']);
    });
  });

  describe('error handling', () => {
    it('middleware errors propagate to dispatch caller', async () => {
      const router = new TreeRouter<TestContext>();

      router.useMiddleware(async (_ctx, _next) => {
        throw new Error('mw-error');
      });

      router.command('/start', async (ctx) => {
        ctx.trace.push('handler');
      });

      const ctx: TestContext = { trace: [], command: '/start' };
      await expect(router.dispatch(ctx)).rejects.toThrow('mw-error');
      expect(ctx.trace).toEqual([]);
    });
  });
});
