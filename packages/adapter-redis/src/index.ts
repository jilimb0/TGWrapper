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
