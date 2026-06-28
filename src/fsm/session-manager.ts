import { SessionConflictError } from '../core/errors.js';
import type {
  JsonObject,
  MetricsCollector,
  SessionEnvelope,
  SessionStorage,
  VersionedValue,
} from '../types/core.js';

export interface SessionManagerOptions<TState extends string, TData extends JsonObject> {
  storage: SessionStorage<SessionEnvelope<TState, TData>>;
  initialData: () => TData;
  encryptionRequired?: boolean;
  conflictRetries?: number;
  metrics?: MetricsCollector;
}

export class SessionManager<TState extends string, TData extends JsonObject> {
  private readonly storage: SessionStorage<SessionEnvelope<TState, TData>>;
  private readonly initialData: () => TData;
  private readonly encryptionRequired: boolean;
  private readonly conflictRetries: number;
  private readonly metrics: MetricsCollector | undefined;

  public constructor(options: SessionManagerOptions<TState, TData>) {
    this.storage = options.storage;
    this.initialData = options.initialData;
    this.encryptionRequired = options.encryptionRequired ?? false;
    this.conflictRetries = options.conflictRetries ?? 3;
    this.metrics = options.metrics;
  }

  public async load(sessionKey: string): Promise<VersionedValue<SessionEnvelope<TState, TData>>> {
    const existing = await this.storage.getWithVersion(sessionKey);
    if (existing) {
      this.assertSecurity(existing.value);
      return existing;
    }

    const created = this.createInitialSession();
    const saved = await this.storage.compareAndSet(sessionKey, 0, created);
    if (!saved.ok) {
      this.metrics?.increment('session_conflict_count');
      const fallback = await this.storage.getWithVersion(sessionKey);
      if (fallback) {
        return fallback;
      }
      throw new SessionConflictError(sessionKey);
    }

    return {
      value: created,
      version: created.version,
    };
  }

  public async runInSession<TResult>(
    sessionKey: string,
    runner: (session: SessionEnvelope<TState, TData>) => Promise<TResult>,
  ): Promise<TResult> {
    for (let attempt = 1; attempt <= this.conflictRetries + 1; attempt += 1) {
      const current = await this.load(sessionKey);
      const mutableSession = this.cloneSession(current.value);
      const result = await runner(mutableSession);
      this.assertSecurity(mutableSession);

      mutableSession.version = current.version + 1;
      mutableSession.updated_at = new Date().toISOString();

      const save = await this.storage.compareAndSet(sessionKey, current.version, mutableSession);
      if (save.ok) {
        return result;
      }

      this.metrics?.increment('session_conflict_count');
      if (attempt > this.conflictRetries) {
        throw new SessionConflictError(sessionKey);
      }
    }

    throw new SessionConflictError(sessionKey);
  }

  private createInitialSession(): SessionEnvelope<TState, TData> {
    return {
      current_state: null,
      data: this.initialData(),
      version: 1,
      encrypted: !this.encryptionRequired,
      updated_at: new Date().toISOString(),
    };
  }

  private cloneSession(session: SessionEnvelope<TState, TData>): SessionEnvelope<TState, TData> {
    return {
      current_state: session.current_state,
      data: { ...session.data },
      version: session.version,
      encrypted: session.encrypted,
      updated_at: session.updated_at,
    };
  }

  private assertSecurity(session: SessionEnvelope<TState, TData>): void {
    if (this.encryptionRequired && !session.encrypted) {
      throw new Error('Session contains sensitive data and must be encrypted before saving.');
    }
  }
}
