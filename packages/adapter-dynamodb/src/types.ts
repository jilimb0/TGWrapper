import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';

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
  compareAndSet(
    key: string,
    expectedVersion: number,
    nextValue: TSession,
  ): Promise<CasResult<TSession>>;
}

export interface DynamoDBAdapterOptions {
  client?: DynamoDBClient;
  region?: string;
  tableName?: string;
  tenantId: string;
  botId: string;
  ttlSeconds?: number;
  endpoint?: string;
}

export const DEFAULT_TABLE_NAME = 'tgwrapper-sessions';
