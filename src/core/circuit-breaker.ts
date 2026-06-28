import type { CircuitBreakerOptions } from '../types/core.js';
import { CircuitOpenError } from './errors.js';

type CircuitState = 'closed' | 'open' | 'half_open';

const DEFAULT_CIRCUIT: CircuitBreakerOptions = {
  failureThreshold: 5,
  cooldownMs: 15_000,
  halfOpenMaxRequests: 1,
};

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private openedAt = 0;
  private halfOpenRequests = 0;
  private readonly options: CircuitBreakerOptions;

  public constructor(options?: Partial<CircuitBreakerOptions>) {
    this.options = { ...DEFAULT_CIRCUIT, ...options };
  }

  public beforeRequest(nowMs: number): void {
    if (this.state === 'open') {
      const elapsed = nowMs - this.openedAt;
      if (elapsed >= this.options.cooldownMs) {
        this.state = 'half_open';
        this.halfOpenRequests = 0;
      } else {
        throw new CircuitOpenError(this.options.cooldownMs - elapsed);
      }
    }

    if (this.state === 'half_open') {
      if (this.halfOpenRequests >= this.options.halfOpenMaxRequests) {
        throw new CircuitOpenError(this.options.cooldownMs);
      }
      this.halfOpenRequests += 1;
    }
  }

  public onSuccess(): void {
    this.state = 'closed';
    this.failures = 0;
    this.halfOpenRequests = 0;
  }

  public onFailure(nowMs: number): void {
    if (this.state === 'half_open') {
      this.state = 'open';
      this.openedAt = nowMs;
      this.halfOpenRequests = 0;
      return;
    }

    this.failures += 1;
    if (this.failures >= this.options.failureThreshold) {
      this.state = 'open';
      this.openedAt = nowMs;
    }
  }

  public snapshot(): { state: CircuitState; failures: number } {
    return {
      state: this.state,
      failures: this.failures,
    };
  }
}
