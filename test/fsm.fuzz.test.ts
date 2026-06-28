import { describe, expect, it } from 'vitest';
import { SessionManager } from '../src/fsm/session-manager.js';
import { MemorySessionStorage } from '../src/storage/memory-session-storage.js';
import type { SessionEnvelope } from '../src/types/core.js';

type State = 'idle';
interface Data {
  count: number;
}

describe('FSM optimistic locking fuzz', () => {
  it('preserves all increments under contention', async () => {
    const storage = new MemorySessionStorage<SessionEnvelope<State, Data>>();
    const manager = new SessionManager<State, Data>({
      storage,
      initialData: () => ({ count: 0 }),
      conflictRetries: 50,
    });

    const increments = 50;
    await Promise.all(
      Array.from({ length: increments }, () =>
        manager.runInSession('user:1', async (session) => {
          const next = session.data.count + 1;
          session.data.count = next;
        }),
      ),
    );

    const finalValue = await storage.get('user:1');
    expect(finalValue?.data.count).toBe(increments);
  });
});
