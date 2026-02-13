import type { CasResult, SessionStorage, VersionedValue } from '../types/core.js';

export class MemorySessionStorage<TSession extends { version: number }> implements SessionStorage<TSession> {
  private readonly store = new Map<string, VersionedValue<TSession>>();

  public async get(key: string): Promise<TSession | null> {
    return this.store.get(key)?.value ?? null;
  }

  public async set(key: string, value: TSession): Promise<void> {
    this.store.set(key, {
      value,
      version: value.version
    });
  }

  public async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  public async getWithVersion(key: string): Promise<VersionedValue<TSession> | null> {
    const found = this.store.get(key);
    if (!found) {
      return null;
    }

    return {
      value: found.value,
      version: found.version
    };
  }

  public async compareAndSet(key: string, expectedVersion: number, nextValue: TSession): Promise<CasResult<TSession>> {
    const current = this.store.get(key);

    if (!current && expectedVersion === 0) {
      this.store.set(key, {
        value: nextValue,
        version: nextValue.version
      });
      return { ok: true };
    }

    if (!current || current.version !== expectedVersion) {
      if (!current) {
        return { ok: false };
      }
      return {
        ok: false,
        current: {
          value: current.value,
          version: current.version
        }
      };
    }

    this.store.set(key, {
      value: nextValue,
      version: nextValue.version
    });
    return { ok: true };
  }
}
