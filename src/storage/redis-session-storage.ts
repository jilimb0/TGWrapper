import type { CasResult, SessionStorage, VersionedValue } from '../types/core.js';

export interface RedisLikeTransaction {
  get(key: string): Promise<string | null>;
  watch(key: string): Promise<void>;
  multi(commands: ReadonlyArray<readonly [string, ...string[]]>): Promise<ReadonlyArray<unknown> | null>;
  unwatch(): Promise<void>;
}

export interface RedisLikeClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: 'EX', ttlSeconds?: number): Promise<unknown>;
  del(key: string): Promise<number>;
  withTransaction<T>(runner: (tx: RedisLikeTransaction) => Promise<T>): Promise<T>;
}

export interface SessionCrypto<TSession> {
  encrypt(session: TSession): Promise<string>;
  decrypt(payload: string): Promise<TSession>;
}

export interface RedisSessionStorageOptions<TSession extends { version: number }> {
  client: RedisLikeClient;
  namespace?: string;
  ttlSeconds?: number;
  crypto?: SessionCrypto<TSession>;
}

export class RedisSessionStorage<TSession extends { version: number }> implements SessionStorage<TSession> {
  private readonly client: RedisLikeClient;
  private readonly namespace: string;
  private readonly ttlSeconds: number | undefined;
  private readonly crypto: SessionCrypto<TSession> | undefined;

  public constructor(options: RedisSessionStorageOptions<TSession>) {
    this.client = options.client;
    this.namespace = options.namespace ?? 'tgfw';
    this.ttlSeconds = options.ttlSeconds;
    this.crypto = options.crypto;
  }

  public async get(key: string): Promise<TSession | null> {
    const raw = await this.client.get(this.formatKey(key));
    if (!raw) {
      return null;
    }

    return this.deserialize(raw);
  }

  public async set(key: string, value: TSession): Promise<void> {
    const raw = await this.serialize(value);
    await this.writeValue(this.formatKey(key), raw);
  }

  public async delete(key: string): Promise<void> {
    await this.client.del(this.formatKey(key));
  }

  public async getWithVersion(key: string): Promise<VersionedValue<TSession> | null> {
    const value = await this.get(key);
    if (!value) {
      return null;
    }

    return {
      value,
      version: value.version
    };
  }

  public async compareAndSet(key: string, expectedVersion: number, nextValue: TSession): Promise<CasResult<TSession>> {
    const fullKey = this.formatKey(key);

    return this.client.withTransaction(async (tx) => {
      await tx.watch(fullKey);
      const currentRaw = await tx.get(fullKey);
      if (!currentRaw) {
        if (expectedVersion !== 0) {
          await tx.unwatch();
          return { ok: false };
        }

        const created = await this.serialize(nextValue);
        const result = await tx.multi(this.toSetCommands(fullKey, created));
        if (result === null) {
          return { ok: false };
        }

        return { ok: true };
      }

      const current = await this.deserialize(currentRaw);
      if (current.version !== expectedVersion) {
        await tx.unwatch();
        return {
          ok: false,
          current: {
            value: current,
            version: current.version
          }
        };
      }

      const serialized = await this.serialize(nextValue);
      const result = await tx.multi(this.toSetCommands(fullKey, serialized));
      if (result === null) {
        return { ok: false };
      }

      return { ok: true };
    });
  }

  private formatKey(key: string): string {
    return `${this.namespace}:session:${key}`;
  }

  private async serialize(session: TSession): Promise<string> {
    if (this.crypto) {
      return this.crypto.encrypt(session);
    }
    return JSON.stringify(session);
  }

  private async deserialize(payload: string): Promise<TSession> {
    if (this.crypto) {
      return this.crypto.decrypt(payload);
    }
    return JSON.parse(payload) as TSession;
  }

  private async writeValue(key: string, serialized: string): Promise<void> {
    if (this.ttlSeconds && this.ttlSeconds > 0) {
      await this.client.set(key, serialized, 'EX', this.ttlSeconds);
      return;
    }
    await this.client.set(key, serialized);
  }

  private toSetCommands(key: string, serialized: string): ReadonlyArray<readonly [string, ...string[]]> {
    if (this.ttlSeconds && this.ttlSeconds > 0) {
      return [['SET', key, serialized, 'EX', String(this.ttlSeconds)]];
    }
    return [['SET', key, serialized]];
  }
}
