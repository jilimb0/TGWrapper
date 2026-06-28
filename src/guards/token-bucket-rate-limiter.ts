export interface RateLimitConfig {
  capacity: number;
  refillPerSecond: number;
}

interface BucketState {
  tokens: number;
  lastRefillMs: number;
}

export class TokenBucketRateLimiter {
  private readonly config: RateLimitConfig;
  private readonly buckets = new Map<string, BucketState>();

  public constructor(config: RateLimitConfig) {
    this.config = config;
  }

  public allow(key: string, nowMs = Date.now()): boolean {
    const state = this.buckets.get(key) ?? {
      tokens: this.config.capacity,
      lastRefillMs: nowMs,
    };

    const elapsedSec = (nowMs - state.lastRefillMs) / 1000;
    const refilled = Math.min(
      this.config.capacity,
      state.tokens + elapsedSec * this.config.refillPerSecond,
    );
    const next: BucketState = {
      tokens: refilled,
      lastRefillMs: nowMs,
    };

    if (next.tokens < 1) {
      this.buckets.set(key, next);
      return false;
    }

    next.tokens -= 1;
    this.buckets.set(key, next);
    return true;
  }
}
