import type { CasResult, SessionStorage, VersionedValue } from '../types/core.js';
import { MemorySessionStorage } from './memory-session-storage.js';

export interface FailsafeSessionStorageOptions<TSession extends { version: number }> {
  primary: SessionStorage<TSession>;
  logger?: { warn: (msg: string) => void };
  retryAfterMs?: number;
}

const NOOP_LOGGER = { warn: () => {} };

/**
 * Wraps a primary SessionStorage with automatic fallback to MemorySessionStorage.
 * If the primary throws, it logs a warning once and uses in-memory storage.
 * After retryAfterMs, it tries the primary again.
 */
export class FailsafeSessionStorage<TSession extends { version: number }>
  implements SessionStorage<TSession>
{
  private readonly primary: SessionStorage<TSession>;
  private readonly memory: MemorySessionStorage<TSession>;
  private readonly logger: { warn: (msg: string) => void };
  private readonly retryAfterMs: number;
  private failed = false;
  private retryAt = 0;

  public constructor(options: FailsafeSessionStorageOptions<TSession>) {
    this.primary = options.primary;
    this.memory = new MemorySessionStorage();
    this.logger = options.logger ?? NOOP_LOGGER;
    this.retryAfterMs = options.retryAfterMs ?? 5_000;
  }

  private usePrimary(): boolean {
    if (!this.failed) return true;
    if (Date.now() >= this.retryAt) {
      this.failed = false;
      return true;
    }
    return false;
  }

  private recordFailure(context: string, err: unknown): void {
    if (this.failed) return;
    this.failed = true;
    this.retryAt = Date.now() + this.retryAfterMs;
    this.logger.warn(
      `FailsafeSessionStorage: primary storage failed for "${context}", ` +
      `falling back to memory for ${this.retryAfterMs}ms. ` +
      `Error: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  private async delegate<T>(
    primaryFn: () => Promise<T>,
    memoryFn: () => Promise<T>,
    context: string,
  ): Promise<T> {
    if (this.usePrimary()) {
      try {
        return await primaryFn();
      } catch (err) {
        this.recordFailure(context, err);
      }
    }
    return memoryFn();
  }

  public async get(key: string): Promise<TSession | null> {
    return this.delegate(
      () => this.primary.get(key),
      () => this.memory.get(key),
      'get',
    );
  }

  public async set(key: string, value: TSession): Promise<void> {
    return this.delegate(
      () => this.primary.set(key, value),
      () => this.memory.set(key, value),
      'set',
    );
  }

  public async delete(key: string): Promise<void> {
    return this.delegate(
      () => this.primary.delete(key),
      () => this.memory.delete(key),
      'delete',
    );
  }

  public async getWithVersion(key: string): Promise<VersionedValue<TSession> | null> {
    return this.delegate(
      () => this.primary.getWithVersion(key),
      () => this.memory.getWithVersion(key),
      'getWithVersion',
    );
  }

  public async compareAndSet(
    key: string,
    expectedVersion: number,
    nextValue: TSession,
  ): Promise<CasResult<TSession>> {
    return this.delegate(
      () => this.primary.compareAndSet(key, expectedVersion, nextValue),
      () => this.memory.compareAndSet(key, expectedVersion, nextValue),
      'compareAndSet',
    );
  }
}
