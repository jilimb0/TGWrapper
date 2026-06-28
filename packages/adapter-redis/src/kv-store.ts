import { Redis } from 'ioredis';
import type { RedisKvOptions, ScanOptions } from './types.js';
import { RedisCacheStore } from './cache.js';

const INDEX_ADD_SCRIPT = `
redis.call('SADD', KEYS[1], ARGV[1])
return 1
`;

const INDEX_REMOVE_SCRIPT = `
redis.call('SREM', KEYS[1], ARGV[1])
return 1
`;

export class RedisKvStore {
  private readonly redis: Redis;
  private readonly prefix: string;
  private readonly defaultTtlSeconds: number;

  public constructor(options: RedisKvOptions) {
    if (options.redis) {
      this.redis = options.redis;
    } else if (options.redisUrl) {
      this.redis = new Redis(options.redisUrl, {
        maxRetriesPerRequest: 1,
        lazyConnect: false,
      });
    } else {
      throw new Error('Either redis or redisUrl must be provided to RedisKvStore');
    }
    this.prefix = options.prefix ?? 'framework:kv';
    this.defaultTtlSeconds = options.defaultTtlSeconds ?? 0;
  }

  public withNamespace(namespace: string): RedisKvNamespace {
    return new RedisKvNamespace(this, namespace);
  }

  public createCacheNamespace(namespace: string): RedisCacheStore {
    return new RedisCacheStore(this.withNamespace(namespace));
  }

  public createSessionNamespace(namespace: string): RedisKvNamespace {
    return this.withNamespace(namespace);
  }

  public async get(key: string): Promise<string | null> {
    return this.redis.get(this.fullKey(key));
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    if (ttl > 0) {
      await this.redis.set(this.fullKey(key), value, 'EX', ttl);
      return;
    }
    await this.redis.set(this.fullKey(key), value);
  }

  public async del(key: string): Promise<void> {
    await this.redis.del(this.fullKey(key));
  }

  public async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(this.fullKey(key))) > 0;
  }

  public async ttl(key: string): Promise<number> {
    return this.redis.ttl(this.fullKey(key));
  }

  public async incr(key: string): Promise<number> {
    return this.redis.incr(this.fullKey(key));
  }

  public async scanKeys(options: ScanOptions = {}): Promise<string[]> {
    const count = options.count ?? 100;
    const match = options.match ? this.fullKey(options.match) : `${this.prefix}:*`;
    let cursor = '0';
    const keys: string[] = [];

    do {
      const [nextCursor, batch] = await this.redis.scan(
        cursor,
        'MATCH',
        match,
        'COUNT',
        String(count),
      );
      cursor = nextCursor;
      for (const key of batch) {
        keys.push(key.startsWith(`${this.prefix}:`) ? key.slice(this.prefix.length + 1) : key);
      }
    } while (cursor !== '0');

    return keys;
  }

  public async indexAdd(indexName: string, key: string): Promise<void> {
    await this.redis.eval(INDEX_ADD_SCRIPT, 1, this.indexKey(indexName), this.fullKey(key));
  }

  public async indexRemove(indexName: string, key: string): Promise<void> {
    await this.redis.eval(INDEX_REMOVE_SCRIPT, 1, this.indexKey(indexName), this.fullKey(key));
  }

  public async indexMembers(indexName: string): Promise<string[]> {
    const members = await this.redis.smembers(this.indexKey(indexName));
    return members.map((key) =>
      key.startsWith(`${this.prefix}:`) ? key.slice(this.prefix.length + 1) : key,
    );
  }

  public async disconnect(): Promise<void> {
    await this.redis.quit();
  }

  public async eval(script: string, numKeys: number, ...args: string[]): Promise<unknown> {
    return this.redis.eval(script, numKeys, ...args);
  }

  public async delStorageKeys(...storageKeys: string[]): Promise<void> {
    if (storageKeys.length === 0) {
      return;
    }
    await this.redis.del(...storageKeys);
  }

  public createPrefix(...parts: string[]): string {
    const normalized = parts
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .join(':');
    return normalized ? `${normalized}:` : '';
  }

  private fullKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  public toStorageKey(key: string): string {
    return this.fullKey(key);
  }

  private indexKey(indexName: string): string {
    return `${this.prefix}:index:${indexName}`;
  }
}

export class RedisKvNamespace {
  private readonly store: RedisKvStore;
  private readonly namespace: string;

  public constructor(store: RedisKvStore, namespace: string) {
    this.store = store;
    this.namespace = namespace.trim();
  }

  public async get(key: string): Promise<string | null> {
    return this.store.get(this.qualify(key));
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await this.store.set(this.qualify(key), value, ttlSeconds);
  }

  public async del(key: string): Promise<void> {
    await this.store.del(this.qualify(key));
  }

  public async exists(key: string): Promise<boolean> {
    return this.store.exists(this.qualify(key));
  }

  public async ttl(key: string): Promise<number> {
    return this.store.ttl(this.qualify(key));
  }

  public async incr(key: string): Promise<number> {
    return this.store.incr(this.qualify(key));
  }

  public async scanKeys(options: ScanOptions = {}): Promise<string[]> {
    const scopedMatch = options.match
      ? `${this.namespace}:${options.match}`
      : `${this.namespace}:*`;
    const keys = await this.store.scanKeys({
      ...options,
      match: scopedMatch,
    });
    return keys.map((key) =>
      key.startsWith(`${this.namespace}:`) ? key.slice(this.namespace.length + 1) : key,
    );
  }

  public async indexAdd(indexName: string, key: string): Promise<void> {
    await this.store.indexAdd(`${this.namespace}:${indexName}`, this.qualify(key));
  }

  public async indexRemove(indexName: string, key: string): Promise<void> {
    await this.store.indexRemove(`${this.namespace}:${indexName}`, this.qualify(key));
  }

  public async indexMembers(indexName: string): Promise<string[]> {
    const members = await this.store.indexMembers(`${this.namespace}:${indexName}`);
    return members.map((key) =>
      key.startsWith(`${this.namespace}:`) ? key.slice(this.namespace.length + 1) : key,
    );
  }

  private qualify(key: string): string {
    return `${this.namespace}:${key}`;
  }
}
