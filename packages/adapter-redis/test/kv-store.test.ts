import { describe, it, expect, vi } from 'vitest';
import type { Redis } from 'ioredis';
import { RedisKvStore } from '../src/kv-store.js';

function createMockRedis(): Redis {
  return {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
    exists: vi.fn(),
    keys: vi.fn(),
    pttl: vi.fn(),
    multi: vi.fn(() => ({
      exec: vi.fn().mockResolvedValue([]),
      set: vi.fn(),
      get: vi.fn(),
      del: vi.fn(),
      expire: vi.fn(),
      ttl: vi.fn(),
      setex: vi.fn(),
    })),
    evalsha: vi.fn(),
    script: vi.fn(),
  } as unknown as Redis;
}

describe('RedisKvStore', () => {
  it('get returns null for missing key', async () => {
    const redis = createMockRedis();
    vi.mocked(redis.get).mockResolvedValue(null);
    const store = new RedisKvStore({ redis, prefix: 'test' });
    const result = await store.get('missing');
    expect(result).toBeNull();
  });

  it('get returns parsed value', async () => {
    const redis = createMockRedis();
    vi.mocked(redis.get).mockResolvedValue(JSON.stringify({ data: 42 }));
    const store = new RedisKvStore({ redis, prefix: 'test' });
    const result = await store.get<{ data: number }>('key');
    expect(result).toEqual({ data: 42 });
  });

  it('set stores serialized value', async () => {
    const redis = createMockRedis();
    vi.mocked(redis.set).mockResolvedValue('OK');
    const store = new RedisKvStore({ redis, prefix: 'test' });
    await store.set('key', { hello: 'world' });
    expect(redis.set).toHaveBeenCalledWith(
      'test:key',
      JSON.stringify({ hello: 'world' }),
    );
  });

  it('setex stores with TTL', async () => {
    const redis = createMockRedis();
    vi.mocked(redis.setex).mockResolvedValue('OK');
    const store = new RedisKvStore({ redis, prefix: 'test', defaultTtlSeconds: 60 });
    await store.set('key', 'value');
    expect(redis.setex).toHaveBeenCalledWith('test:key', 60, JSON.stringify('value'));
  });

  it('delete removes key', async () => {
    const redis = createMockRedis();
    vi.mocked(redis.del).mockResolvedValue(1);
    const store = new RedisKvStore({ redis, prefix: 'test' });
    await store.delete('key');
    expect(redis.del).toHaveBeenCalledWith('test:key');
  });
});
