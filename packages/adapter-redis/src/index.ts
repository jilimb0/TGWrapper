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

  public async scanKeys(options: Omit<ScanOptions, 'match'> = {}): Promise<string[]> {
    const keys = await this.store.scanKeys({
      ...options,
      match: `${this.namespace}:*`
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
