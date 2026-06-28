import { describe, expect, it, vi } from 'vitest';
import { BotRuntime } from '../src/runtime/bot-runtime.js';
import type { UpdateSource } from '../src/types/core.js';
import type { Update } from '../src/types/telegram.js';

class SingleUpdateSource implements UpdateSource {
  private running = false;

  public async run(onUpdate: (update: Update) => Promise<void>): Promise<void> {
    this.running = true;
    await onUpdate({
      update_id: 1,
      message: { message_id: 1, date: 1, chat: { id: 1, type: 'private', first_name: 'A' } },
    } as Update);
    while (this.running) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  public async stop(): Promise<void> {
    this.running = false;
  }
}

describe('BotRuntime lifecycle and hooks', () => {
  it('supports start/stop/isRunning lifecycle', async () => {
    const source = new SingleUpdateSource();
    const runtime = new BotRuntime(source, {
      handleUpdate: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      },
    });

    expect(runtime.isRunning()).toBe(false);
    const startPromise = runtime.start();
    await new Promise((resolve) => setTimeout(resolve, 2));
    expect(runtime.isRunning()).toBe(true);

    await runtime.stop();
    await startPromise;
    expect(runtime.isRunning()).toBe(false);
  });

  it('emits onUpdate/onError hooks and onError subscription', async () => {
    const source = new SingleUpdateSource();
    const onUpdate = vi.fn();
    const onErrorHook = vi.fn();
    const onErrorSubscription = vi.fn();

    const runtime = new BotRuntime(
      source,
      {
        handleUpdate: async () => {
          throw new Error('boom');
        },
      },
      {
        hooks: {
          onUpdate,
          onError: onErrorHook,
        },
      },
    );

    runtime.onError(onErrorSubscription);

    await expect(runtime.start()).rejects.toThrow('boom');
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onErrorHook).toHaveBeenCalledTimes(1);
    expect(onErrorSubscription).toHaveBeenCalledTimes(1);
  });
});
