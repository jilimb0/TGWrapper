import type { RedisRateLimiterConfig, RateLimitResult } from './types.js';
import type { RedisKvStore } from './kv-store.js';

const RATE_LIMITER_SCRIPT = `
local counter_key = KEYS[1]
local block_key = KEYS[2]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local block_ms = tonumber(ARGV[4])
local member = ARGV[5]

local block_ttl = redis.call('PTTL', block_key)
if block_ttl > 0 then
  local retry_after = math.ceil(block_ttl / 1000)
  return {0, 0, retry_after, now + block_ttl}
end

redis.call('ZREMRANGEBYSCORE', counter_key, 0, now - window_ms)
local current = redis.call('ZCARD', counter_key)
if current >= limit then
  local oldest = redis.call('ZRANGE', counter_key, 0, 0, 'WITHSCORES')
  local oldest_score = now
  if oldest[2] then
    oldest_score = tonumber(oldest[2])
  end
  local reset_ms = oldest_score + window_ms
  local retry_ms = math.max(1, reset_ms - now)

  if block_ms > 0 then
    redis.call('PSETEX', block_key, block_ms, '1')
    retry_ms = block_ms
    reset_ms = now + block_ms
  end

  return {0, 0, math.ceil(retry_ms / 1000), reset_ms}
end

redis.call('ZADD', counter_key, now, member)
redis.call('PEXPIRE', counter_key, window_ms + 1000)
local next_count = redis.call('ZCARD', counter_key)
local remaining = limit - next_count
if remaining < 0 then
  remaining = 0
end

local oldest = redis.call('ZRANGE', counter_key, 0, 0, 'WITHSCORES')
local oldest_score = now
if oldest[2] then
  oldest_score = tonumber(oldest[2])
end
local reset_at = oldest_score + window_ms
return {1, remaining, 0, reset_at}
`;

const RATE_LIMITER_INFO_SCRIPT = `
local counter_key = KEYS[1]
local block_key = KEYS[2]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

local block_ttl = redis.call('PTTL', block_key)
if block_ttl > 0 then
  local retry_after = math.ceil(block_ttl / 1000)
  return {0, 0, retry_after, now + block_ttl}
end

redis.call('ZREMRANGEBYSCORE', counter_key, 0, now - window_ms)
local current = redis.call('ZCARD', counter_key)
local remaining = limit - current
if remaining < 0 then
  remaining = 0
end

local oldest = redis.call('ZRANGE', counter_key, 0, 0, 'WITHSCORES')
local oldest_score = now
if oldest[2] then
  oldest_score = tonumber(oldest[2])
end
local reset_at = oldest_score + window_ms
local allowed = 1
local retry_after = 0
if current >= limit then
  allowed = 0
  retry_after = math.ceil(math.max(1, reset_at - now) / 1000)
end
return {allowed, remaining, retry_after, reset_at}
`;

export class RedisRateLimiter {
  private readonly store: RedisKvStore;
  private readonly config: Required<RedisRateLimiterConfig>;

  public constructor(store: RedisKvStore, config: RedisRateLimiterConfig) {
    this.store = store;
    this.config = {
      namespace: config.namespace ?? 'rate_limit',
      windowMs: config.windowMs,
      limit: config.limit,
      blockDurationMs: config.blockDurationMs ?? 0,
    };
  }

  public async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const normalizedKey = this.normalizeKey(key);
    const counterKey = this.store.toStorageKey(`${this.config.namespace}:${normalizedKey}:counter`);
    const blockKey = this.store.toStorageKey(`${this.config.namespace}:${normalizedKey}:block`);
    const member = `${now}:${Math.random().toString(36).slice(2, 10)}`;
    const result = (await this.store.eval(
      RATE_LIMITER_SCRIPT,
      2,
      counterKey,
      blockKey,
      String(now),
      String(this.config.windowMs),
      String(this.config.limit),
      String(this.config.blockDurationMs),
      member,
    )) as [number, number, number, number];

    const allowed = result[0] === 1;
    const remaining = Number(result[1] ?? 0);
    const retryAfter = Number(result[2] ?? 0);
    const resetAt = Number(result[3] ?? now + this.config.windowMs);
    return {
      allowed,
      remaining,
      ...(retryAfter > 0 ? { retryAfter } : {}),
      resetAt,
    };
  }

  public async reset(key: string): Promise<void> {
    const normalizedKey = this.normalizeKey(key);
    const counterKey = this.store.toStorageKey(`${this.config.namespace}:${normalizedKey}:counter`);
    const blockKey = this.store.toStorageKey(`${this.config.namespace}:${normalizedKey}:block`);
    await this.store.delStorageKeys(counterKey, blockKey);
  }

  public async getInfo(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const normalizedKey = this.normalizeKey(key);
    const counterKey = this.store.toStorageKey(`${this.config.namespace}:${normalizedKey}:counter`);
    const blockKey = this.store.toStorageKey(`${this.config.namespace}:${normalizedKey}:block`);
    const result = (await this.store.eval(
      RATE_LIMITER_INFO_SCRIPT,
      2,
      counterKey,
      blockKey,
      String(now),
      String(this.config.windowMs),
      String(this.config.limit),
    )) as [number, number, number, number];

    const allowed = result[0] === 1;
    const remaining = Number(result[1] ?? 0);
    const retryAfter = Number(result[2] ?? 0);
    const resetAt = Number(result[3] ?? now + this.config.windowMs);
    return {
      allowed,
      remaining,
      ...(retryAfter > 0 ? { retryAfter } : {}),
      resetAt,
    };
  }

  private normalizeKey(key: string): string {
    return key.replaceAll(':', '_');
  }
}

export function createRateLimiter(
  store: RedisKvStore,
  config: RedisRateLimiterConfig,
): RedisRateLimiter {
  return new RedisRateLimiter(store, config);
}
