import { describe, it, expect, vi } from 'vitest';
import { FailsafeSessionStorage, MemorySessionStorage } from '../src/index.js';
import type { SessionStorage } from '../src/types/core.js';

interface TestSession {
  value: string;
  version: number;
}

function createFailingStorage(): SessionStorage<TestSession> {
  return {
    get: vi.fn().mockRejectedValue(new Error('Redis unavailable')),
    set: vi.fn().mockRejectedValue(new Error('Redis unavailable')),
    delete: vi.fn().mockRejectedValue(new Error('Redis unavailable')),
    getWithVersion: vi.fn().mockRejectedValue(new Error('Redis unavailable')),
    compareAndSet: vi.fn().mockRejectedValue(new Error('Redis unavailable')),
  };
}

describe('FailsafeSessionStorage', () => {
  it('forwards successful operations to primary storage', async () => {
    const primary = new MemorySessionStorage<TestSession>();
    const failsafe = new FailsafeSessionStorage({ primary });
    await failsafe.set('key', { value: 'hello', version: 1 });
    const result = await failsafe.get('key');
    expect(result).toEqual({ value: 'hello', version: 1 });
  });

  it('falls back to memory when primary throws', async () => {
    const primary = createFailingStorage();
    const logger = { warn: vi.fn() };
    const failsafe = new FailsafeSessionStorage({ primary, logger });

    await failsafe.set('key', { value: 'fallback', version: 1 });
    expect(logger.warn).toHaveBeenCalledOnce();

    const result = await failsafe.get('key');
    expect(result).toEqual({ value: 'fallback', version: 1 });
  });

  it('recovers to primary after retry window elapses', async () => {
    let callCount = 0;
    const primary: SessionStorage<TestSession> = {
      get: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount <= 1) throw new Error('temporarily down');
        return { value: 'from-primary', version: 1 };
      }),
      set: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount <= 1) throw new Error('temporarily down');
      }),
      delete: vi.fn().mockImplementation(async () => {}),
      getWithVersion: vi.fn().mockRejectedValue(new Error('never called')),
      compareAndSet: vi.fn().mockRejectedValue(new Error('never called')),
    };

    const failsafe = new FailsafeSessionStorage({ primary, retryAfterMs: 0 });

    await failsafe.set('k', { value: 'mem', version: 1 });
    expect(vi.mocked(primary.set)).toHaveBeenCalled();

    const result = await failsafe.get('k');
    expect(result).toEqual({ value: 'from-primary', version: 1 });
  });

  it('does not log warning on successful operations', async () => {
    const primary = new MemorySessionStorage<TestSession>();
    const logger = { warn: vi.fn() };
    const failsafe = new FailsafeSessionStorage({ primary, logger });

    await failsafe.set('k', { value: 'x', version: 1 });
    const val = await failsafe.get('k');
    expect(val).toEqual({ value: 'x', version: 1 });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs only once on repeated failures', async () => {
    const primary = createFailingStorage();
    const logger = { warn: vi.fn() };
    const failsafe = new FailsafeSessionStorage({ primary, logger });

    await failsafe.set('a', { value: '1', version: 1 });
    await failsafe.set('b', { value: '2', version: 1 });
    await failsafe.set('c', { value: '3', version: 1 });

    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
