import { Redis } from 'ioredis';

export interface VersionedValue<T> {
  value: T;
  version: number;
}

export interface CasResult<T> {
  ok: boolean;
  current?: VersionedValue<T>;
}

export interface SessionStorage<TSession> {
  get(key: string): Promise<TSession | null>;
  set(key: string, value: TSession): Promise<void>;
  delete(key: string): Promise<void>;
  getWithVersion(key: string): Promise<VersionedValue<TSession> | null>;
  compareAndSet(key: string, expectedVersion: number, nextValue: TSession): Promise<CasResult<TSession>>;
}

export interface RedisAdapterOptions {
  redisUrl: string;
  tenantId: string;
  botId: string;
  ttlSeconds?: number;
}

export interface RedisKvOptions {
  redisUrl: string;
  prefix?: string;
  defaultTtlSeconds?: number;
}

export interface ScanOptions {
  match?: string;
  count?: number;
}

export interface RedisRateLimiterConfig {
  namespace?: string;
  windowMs: number;
  limit: number;
  blockDurationMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
  resetAt: number;
}

const CAS_SCRIPT = `
local key = KEYS[1]
local expected = tonumber(ARGV[1])
local next_payload = ARGV[2]
local ttl = tonumber(ARGV[3])

local current = redis.call('GET', key)
if not current then
  if expected ~= 0 then
    return {0, ''}
  end
  if ttl > 0 then
    redis.call('SET', key, next_payload, 'EX', ttl)
  else
    redis.call('SET', key, next_payload)
  end
  return {1, ''}
end

local decoded = cjson.decode(current)
if tonumber(decoded.version) ~= expected then
  return {0, current}
end

if ttl > 0 then
  redis.call('SET', key, next_payload, 'EX', ttl)
else
  redis.call('SET', key, next_payload)
end
return {1, ''}
`;

const INDEX_ADD_SCRIPT = `
redis.call('SADD', KEYS[1], ARGV[1])
return 1
`;

const INDEX_REMOVE_SCRIPT = `
redis.call('SREM', KEYS[1], ARGV[1])
return 1
`;

const RATE_LIMITER_SCRIPT = `
local counter_key = KEYS[1]
local block_key = KEYS[2]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local block_ms = tonumber(ARGV[4])
local member = ARGV[5]

local block_ttl = redis.call('PTTL', block_key)
if block_ttl > 0 then
  local retry_after = math.ceil(block_ttl / 1000)
  return {0, 0, retry_after, now + block_ttl}
end

redis.call('ZREMRANGEBYSCORE', counter_key, 0, now - window_ms)
local current = redis.call('ZCARD', counter_key)
if current >= limit then
  local oldest = redis.call('ZRANGE', counter_key, 0, 0, 'WITHSCORES')
  local oldest_score = now
  if oldest[2] then
    oldest_score = tonumber(oldest[2])
  end
  local reset_ms = oldest_score + window_ms
  local retry_ms = math.max(1, reset_ms - now)

  if block_ms > 0 then
    redis.call('PSETEX', block_key, block_ms, '1')
    retry_ms = block_ms
    reset_ms = now + block_ms
  end

  return {0, 0, math.ceil(retry_ms / 1000), reset_ms}
end

redis.call('ZADD', counter_key, now, member)
redis.call('PEXPIRE', counter_key, window_ms + 1000)
local next_count = redis.call('ZCARD', counter_key)
local remaining = limit - next_count
if remaining < 0 then
  remaining = 0
end

local oldest = redis.call('ZRANGE', counter_key, 0, 0, 'WITHSCORES')
local oldest_score = now
if oldest[2] then
  oldest_score = tonumber(oldest[2])
end
local reset_at = oldest_score + window_ms
return {1, remaining, 0, reset_at}
`;

const RATE_LIMITER_INFO_SCRIPT = `
local counter_key = KEYS[1]
local block_key = KEYS[2]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

local block_ttl = redis.call('PTTL', block_key)
if block_ttl > 0 then
  local retry_after = math.ceil(block_ttl / 1000)
  return {0, 0, retry_after, now + block_ttl}
end

redis.call('ZREMRANGEBYSCORE', counter_key, 0, now - window_ms)
local current = redis.call('ZCARD', counter_key)
local remaining = limit - current
if remaining < 0 then
  remaining = 0
end

local oldest = redis.call('ZRANGE', counter_key, 0, 0, 'WITHSCORES')
local oldest_score = now
if oldest[2] then
  oldest_score = tonumber(oldest[2])
end
local reset_at = oldest_score + window_ms
local allowed = 1
local retry_after = 0
if current >= limit then
  allowed = 0
  retry_after = math.ceil(math.max(1, reset_at - now) / 1000)
end
return {allowed, remaining, retry_after, reset_at}
`;

export class RedisSessionAdapter<TSession extends { version: number }> implements SessionStorage<TSession> {
  private readonly redis: Redis;
  private readonly keyPrefix: string;
  private readonly ttlSeconds: number;

  public constructor(options: RedisAdapterOptions) {
    this.redis = new Redis(options.redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: false
    });
    this.keyPrefix = `framework:${options.tenantId}:${options.botId}:session`;
    this.ttlSeconds = options.ttlSeconds ?? 0;
  }

  public async get(key: string): Promise<TSession | null> {
    const raw = await this.redis.get(this.fullKey(key));
    return raw ? (JSON.parse(raw) as TSession) : null;
  }

  public async set(key: string, value: TSession): Promise<void> {
    const payload = JSON.stringify(value);
    if (this.ttlSeconds > 0) {
      await this.redis.set(this.fullKey(key), payload, 'EX', this.ttlSeconds);
      return;
    }
    await this.redis.set(this.fullKey(key), payload);
  }

  public async delete(key: string): Promise<void> {
    await this.redis.del(this.fullKey(key));
  }

  public async getWithVersion(key: string): Promise<VersionedValue<TSession> | null> {
    const value = await this.get(key);
    if (!value) {
      return null;
    }
    return { value, version: value.version };
  }

  public async compareAndSet(key: string, expectedVersion: number, nextValue: TSession): Promise<CasResult<TSession>> {
    const result = (await this.redis.eval(
      CAS_SCRIPT,
      1,
      this.fullKey(key),
      String(expectedVersion),
      JSON.stringify(nextValue),
      String(this.ttlSeconds)
    )) as [number, string];

    const ok = result[0] === 1;
    if (ok) {
      return { ok: true };
    }

    const rawCurrent = result[1];
    if (!rawCurrent) {
      return { ok: false };
    }

    const current = JSON.parse(rawCurrent) as TSession;
    return {
      ok: false,
      current: {
        value: current,
        version: current.version
      }
    };
  }

  public async disconnect(): Promise<void> {
    await this.redis.quit();
  }

  private fullKey(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }
}

export class RedisKvStore {
  private readonly redis: Redis;
  private readonly prefix: string;
  private readonly defaultTtlSeconds: number;

  public constructor(options: RedisKvOptions) {
    this.redis = new Redis(options.redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: false
    });
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
      const [nextCursor, batch] = await this.redis.scan(cursor, 'MATCH', match, 'COUNT', String(count));
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
    return members.map((key) => (key.startsWith(`${this.prefix}:`) ? key.slice(this.prefix.length + 1) : key));
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
    const scopedMatch = options.match ? `${this.namespace}:${options.match}` : `${this.namespace}:*`;
    const keys = await this.store.scanKeys({
      ...options,
      match: scopedMatch
    });
    return keys.map((key) => (key.startsWith(`${this.namespace}:`) ? key.slice(this.namespace.length + 1) : key));
  }

  public async indexAdd(indexName: string, key: string): Promise<void> {
    await this.store.indexAdd(`${this.namespace}:${indexName}`, this.qualify(key));
  }

  public async indexRemove(indexName: string, key: string): Promise<void> {
    await this.store.indexRemove(`${this.namespace}:${indexName}`, this.qualify(key));
  }

  public async indexMembers(indexName: string): Promise<string[]> {
    const members = await this.store.indexMembers(`${this.namespace}:${indexName}`);
    return members.map((key) => (key.startsWith(`${this.namespace}:`) ? key.slice(this.namespace.length + 1) : key));
  }

  private qualify(key: string): string {
    return `${this.namespace}:${key}`;
  }
}

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
      count
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
    }
  };
}

export class RedisRateLimiter {
  private readonly store: RedisKvStore;
  private readonly config: Required<RedisRateLimiterConfig>;

  public constructor(store: RedisKvStore, config: RedisRateLimiterConfig) {
    this.store = store;
    this.config = {
      namespace: config.namespace ?? 'rate_limit',
      windowMs: config.windowMs,
      limit: config.limit,
      blockDurationMs: config.blockDurationMs ?? 0
    };
  }

  public async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const normalizedKey = this.normalizeKey(key);
    const counterKey = this.store.toStorageKey(`${this.config.namespace}:${normalizedKey}:counter`);
    const blockKey = this.store.toStorageKey(`${this.config.namespace}:${normalizedKey}:block`);
    const member = `${now}:${Math.random().toString(36).slice(2, 10)}`;
    const result = (await this.store.eval(
      RATE_LIMITER_SCRIPT,
      2,
      counterKey,
      blockKey,
      String(now),
      String(this.config.windowMs),
      String(this.config.limit),
      String(this.config.blockDurationMs),
      member
    )) as [number, number, number, number];

    const allowed = result[0] === 1;
    const remaining = Number(result[1] ?? 0);
    const retryAfter = Number(result[2] ?? 0);
    const resetAt = Number(result[3] ?? now + this.config.windowMs);
    return {
      allowed,
      remaining,
      ...(retryAfter > 0 ? { retryAfter } : {}),
      resetAt
    };
  }

  public async reset(key: string): Promise<void> {
    const normalizedKey = this.normalizeKey(key);
    const counterKey = this.store.toStorageKey(`${this.config.namespace}:${normalizedKey}:counter`);
    const blockKey = this.store.toStorageKey(`${this.config.namespace}:${normalizedKey}:block`);
    await this.store.delStorageKeys(counterKey, blockKey);
  }

  public async getInfo(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const normalizedKey = this.normalizeKey(key);
    const counterKey = this.store.toStorageKey(`${this.config.namespace}:${normalizedKey}:counter`);
    const blockKey = this.store.toStorageKey(`${this.config.namespace}:${normalizedKey}:block`);
    const result = (await this.store.eval(
      RATE_LIMITER_INFO_SCRIPT,
      2,
      counterKey,
      blockKey,
      String(now),
      String(this.config.windowMs),
      String(this.config.limit)
    )) as [number, number, number, number];

    const allowed = result[0] === 1;
    const remaining = Number(result[1] ?? 0);
    const retryAfter = Number(result[2] ?? 0);
    const resetAt = Number(result[3] ?? now + this.config.windowMs);
    return {
      allowed,
      remaining,
      ...(retryAfter > 0 ? { retryAfter } : {}),
      resetAt
    };
  }

  private normalizeKey(key: string): string {
    return key.replaceAll(':', '_');
  }
}

export function createRateLimiter(store: RedisKvStore, config: RedisRateLimiterConfig): RedisRateLimiter {
  return new RedisRateLimiter(store, config);
}
