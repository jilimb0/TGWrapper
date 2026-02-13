import { describe, expect, it } from 'vitest';
import { TreeRouter } from '../src/router/router.js';

interface TestContext {
  trace: string[];
  command?: string;
  text?: string;
  callbackData?: string;
  currentState?: string | null;
}

describe('TreeRouter', () => {
  it('matches command with highest priority', async () => {
    const router = new TreeRouter<TestContext>();
    router.use(async (ctx) => {
      ctx.trace.push('fallback');
    }, 1);
    router.command('/start', async (ctx) => {
      ctx.trace.push('start');
    }, 100);

    const ctx: TestContext = { trace: [], command: '/start' };
    const handled = await router.dispatch(ctx);

    expect(handled).toBe(true);
    expect(ctx.trace).toEqual(['start']);
  });

  it('uses scene handlers with state-first priority', async () => {
    const router = new TreeRouter<TestContext>();
    router.regex(/hello/i, async (ctx) => {
      ctx.trace.push('regex');
    }, 50);
    router.scene('await_name', [
      async (ctx) => {
        ctx.trace.push('scene');
      }
    ]);

    const ctx: TestContext = {
      trace: [],
      text: 'hello',
      currentState: 'await_name'
    };

    await router.dispatch(ctx);
    expect(ctx.trace).toEqual(['scene']);
  });
});
