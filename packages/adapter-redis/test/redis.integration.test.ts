import { describe, expect, it, beforeEach, afterAll } from 'vitest';
import { RedisSessionAdapter } from '../src/index.js';

interface Session {
  version: number;
  value: string;
}

const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const adapter = new RedisSessionAdapter<Session>({
  redisUrl,
  tenantId: 't1',
  botId: 'b1'
});

describe('RedisSessionAdapter integration', () => {
  beforeEach(async () => {
    await adapter.delete('u1');
  });

  afterAll(async () => {
    await adapter.disconnect();
  });

  it('commits compareAndSet atomically', async () => {
    const created = await adapter.compareAndSet('u1', 0, {
      version: 1,
      value: 'a'
    });
    expect(created.ok).toBe(true);

    const fail = await adapter.compareAndSet('u1', 0, {
      version: 1,
      value: 'b'
    });
    expect(fail.ok).toBe(false);

    const ok = await adapter.compareAndSet('u1', 1, {
      version: 2,
      value: 'c'
    });
    expect(ok.ok).toBe(true);

    const finalValue = await adapter.get('u1');
    expect(finalValue?.value).toBe('c');
    expect(finalValue?.version).toBe(2);
  });

  it('supports passing pre-instantiated ioredis client', async () => {
    const { Redis } = await import('ioredis');
    const customClient = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: false });
    const injectedAdapter = new RedisSessionAdapter<Session>({
      redis: customClient,
      tenantId: 't1',
      botId: 'b1'
    });

    await injectedAdapter.delete('u2');
    const res = await injectedAdapter.compareAndSet('u2', 0, {
      version: 1,
      value: 'custom-client-value'
    });
    expect(res.ok).toBe(true);

    const val = await injectedAdapter.get('u2');
    expect(val?.value).toBe('custom-client-value');

    await injectedAdapter.delete('u2');
    await injectedAdapter.disconnect();
  });
});
