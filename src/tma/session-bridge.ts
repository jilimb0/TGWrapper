import { createSessionKey, type TenantScope } from '../tenant/key-namespace.js';
import type { SessionStorage } from '../types/core.js';

export interface TmaSessionBridgeOptions {
  scope?: TenantScope;
}

export class TmaSessionBridge<TSession> {
  private readonly storage: SessionStorage<TSession>;
  private readonly scope: TenantScope;

  public constructor(storage: SessionStorage<TSession>, options?: TmaSessionBridgeOptions) {
    this.storage = storage;
    this.scope = options?.scope ?? { tenantId: 'default', botId: 'default' };
  }

  public getKey(userId: number | string): string {
    return createSessionKey(this.scope, String(userId));
  }

  public async getSession(userId: number | string): Promise<TSession | null> {
    return this.storage.get(this.getKey(userId));
  }

  public async setSession(userId: number | string, value: TSession): Promise<void> {
    await this.storage.set(this.getKey(userId), value);
  }

  public async updateSession(
    userId: number | string,
    updater: (current: TSession | null) => TSession,
  ): Promise<TSession> {
    const key = this.getKey(userId);
    const current = await this.storage.get(key);
    const updated = updater(current);
    await this.storage.set(key, updated);
    return updated;
  }

  public async deleteSession(userId: number | string): Promise<void> {
    await this.storage.delete(this.getKey(userId));
  }
}
