import type { Redis } from 'ioredis';

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

export interface RedisAdapterOptions {
  redisUrl?: string;
  redis?: Redis;
  tenantId: string;
  botId: string;
  ttlSeconds?: number;
}

export interface RedisKvOptions {
  redisUrl?: string;
  redis?: Redis;
  prefix?: string;
  defaultTtlSeconds?: number;
}

export interface ScanOptions {
  match?: string;
  count?: number;
}

export interface RedisRateLimiterConfig {
  namespace?: string;
  windowMs: number;
  limit: number;
  blockDurationMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
  resetAt: number;
}
