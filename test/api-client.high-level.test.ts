import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/core/api-client.js';

describe('ApiClient high-level methods and hooks', () => {
  it('builds file link and emits api hooks', async () => {
    const onApiCall = vi.fn();
    const onApiResult = vi.fn();
    const onApiError = vi.fn();

    const client = new ApiClient({
      token: 'token',
      onApiCall,
      onApiResult,
      onApiError,
      mockResponder: async (method) => {
        if (method === 'getFile') {
          return { file_path: 'path/file.bin' };
        }
        return true;
      },
    });

    const link = await client.getFileLink('file-id');
    expect(link).toContain('/file/bottoken/path/file.bin');
    expect(onApiCall).toHaveBeenCalled();
    expect(onApiResult).toHaveBeenCalled();
    expect(onApiError).not.toHaveBeenCalled();
  });

  it('supports sendDocument with binary input via typed high-level method', async () => {
    const calls: Array<{ method: string; payload: unknown }> = [];
    const client = new ApiClient({
      token: 'token',
      mockResponder: async (method, payload) => {
        calls.push({ method, payload });
        return {
          message_id: 1,
          date: 1,
          chat: { id: 1, type: 'private', first_name: 'A' },
        };
      },
    });

    const bytes = new TextEncoder().encode('hello');
    const result = await client.sendDocument(1, bytes);

    expect(result).toBeTruthy();
    expect(calls[0]?.method).toBe('sendDocument');
  });
});
