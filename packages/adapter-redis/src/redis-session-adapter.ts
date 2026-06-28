import { Redis } from 'ioredis';
import type { RedisAdapterOptions, SessionStorage, VersionedValue, CasResult } from './types.js';
import { CAS_SCRIPT } from './cas-script.js';

export class RedisSessionAdapter<TSession extends { version: number }>
  implements SessionStorage<TSession>
{
  private readonly redis: Redis;
  private readonly keyPrefix: string;
  private readonly ttlSeconds: number;

  public constructor(options: RedisAdapterOptions) {
    if (options.redis) {
      this.redis = options.redis;
    } else if (options.redisUrl) {
      this.redis = new Redis(options.redisUrl, {
        maxRetriesPerRequest: 1,
        lazyConnect: false,
      });
    } else {
      throw new Error('Either redis or redisUrl must be provided to RedisSessionAdapter');
    }
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

  public async compareAndSet(
    key: string,
    expectedVersion: number,
    nextValue: TSession,
  ): Promise<CasResult<TSession>> {
    const result = (await this.redis.eval(
      CAS_SCRIPT,
      1,
      this.fullKey(key),
      String(expectedVersion),
      JSON.stringify(nextValue),
      String(this.ttlSeconds),
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
        version: current.version,
      },
    };
  }

  public async disconnect(): Promise<void> {
    await this.redis.quit();
  }

  private fullKey(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }
}
