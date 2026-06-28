import { describe, expect, it } from 'vitest';
import { ApiClient } from '../src/core/api-client.js';
import { CircuitOpenError } from '../src/core/errors.js';

describe('ApiClient resilience', () => {
  it('opens circuit after consecutive failures', async () => {
    const client = new ApiClient({
      token: 'test',
      fetchImpl: async () => {
        throw new Error('network down');
      },
      retry: { maxRetries: 0 },
      circuitBreaker: {
        failureThreshold: 2,
        cooldownMs: 1_000,
        halfOpenMaxRequests: 1,
      },
    });

    await expect(client.callApi('sendMessage', { chat_id: 1, text: 'x' })).rejects.toThrow();
    await expect(client.callApi('sendMessage', { chat_id: 1, text: 'x' })).rejects.toThrow();
    await expect(client.callApi('sendMessage', { chat_id: 1, text: 'x' })).rejects.toBeInstanceOf(
      CircuitOpenError,
    );
  });
});
