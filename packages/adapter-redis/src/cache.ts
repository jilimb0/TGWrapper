import type { RedisKvNamespace } from './kv-store.js';
import type { ScanOptions } from './types.js';

export class RedisCacheStore {
  private readonly namespace: RedisKvNamespace;

  public constructor(namespace: RedisKvNamespace) {
    this.namespace = namespace;
  }

  public async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.namespace.get(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  }

  public async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.namespace.set(key, JSON.stringify(value), ttlSeconds);
  }

  public async del(key: string): Promise<void> {
    await this.namespace.del(key);
  }

  public async exists(key: string): Promise<boolean> {
    return this.namespace.exists(key);
  }

  public async ttl(key: string): Promise<number> {
    return this.namespace.ttl(key);
  }

  public async incr(key: string): Promise<number> {
    return this.namespace.incr(key);
  }

  public async keys(pattern = '*', count?: number): Promise<string[]> {
    return this.namespace.scanKeys({
      match: pattern,
      count,
    } as ScanOptions);
  }

  public async clear(pattern = '*', count = 200): Promise<number> {
    const keys = await this.namespace.scanKeys({ match: pattern, count } as ScanOptions);
    if (keys.length === 0) {
      return 0;
    }
    for (const key of keys) {
      await this.namespace.del(key);
    }
    return keys.length;
  }

  public readonly index = {
    upsert: async (indexName: string, key: string): Promise<void> => {
      await this.namespace.indexAdd(indexName, key);
    },
    remove: async (indexName: string, key: string): Promise<void> => {
      await this.namespace.indexRemove(indexName, key);
    },
    members: async (indexName: string): Promise<string[]> => {
      return this.namespace.indexMembers(indexName);
    },
  };
}
