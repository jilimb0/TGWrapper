import type { Db } from 'mongodb';

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

export interface MongoDBAdapterOptions {
  /** Pre-instantiated Db instance. If not provided, connectionUrl + dbName are used. */
  db?: Db;
  /** MongoDB connection URL (required if db is not provided). */
  connectionUrl?: string;
  /** Database name (required if db is not provided). */
  dbName?: string;
  /** Collection name for sessions. Default: 'tgwrapper_sessions' */
  collectionName?: string;
  tenantId: string;
  botId: string;
  /** Session TTL in seconds. 0 = no TTL. */
  ttlSeconds?: number;
}

export const DEFAULT_COLLECTION_NAME = 'tgwrapper_sessions';
