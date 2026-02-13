import { describe, expect, it } from 'vitest';
import { BoundedConcurrencyQueue } from '../src/guards/bounded-concurrency.js';
import { TokenBucketRateLimiter } from '../src/guards/token-bucket-rate-limiter.js';

describe('Runtime guards', () => {
  it('rate limiter blocks when tokens are exhausted', () => {
    const limiter = new TokenBucketRateLimiter({ capacity: 1, refillPerSecond: 0 });
    expect(limiter.allow('tenant')).toBe(true);
    expect(limiter.allow('tenant')).toBe(false);
  });

  it('bounded queue enforces overflow', async () => {
    const queue = new BoundedConcurrencyQueue(1, 0);
    const first = queue.run(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    await expect(
      queue.run(async () => {
        return;
      })
    ).rejects.toThrow('Concurrency queue is full');

    await first;
  });
});
