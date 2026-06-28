import { describe, expect, it } from 'vitest';
import { BotRuntime } from '../src/runtime/bot-runtime.js';
import type { UpdateSource } from '../src/types/core.js';
import type { Update } from '../src/types/telegram.js';

class ControlledSource implements UpdateSource {
  private running = false;

  public async run(onUpdate: (update: Update) => Promise<void>): Promise<void> {
    this.running = true;
    await onUpdate({ update_id: 1 } as Update);
    while (this.running) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  public async stop(): Promise<void> {
    this.running = false;
  }
}

describe('BotRuntime integration', () => {
  it('waits for in-flight handlers on shutdown', async () => {
    const source = new ControlledSource();
    let completed = false;

    const runtime = new BotRuntime(source, {
      handleUpdate: async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        completed = true;
      },
    });

    const startPromise = runtime.start();
    await new Promise((resolve) => setTimeout(resolve, 1));
    await runtime.shutdown();
    await startPromise;

    expect(completed).toBe(true);
  });
});
