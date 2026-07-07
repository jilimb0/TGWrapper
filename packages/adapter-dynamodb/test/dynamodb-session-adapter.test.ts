import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DynamoDBClient, GetItemCommand, PutItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBSessionAdapter } from '../src/dynamodb-session-adapter.js';

vi.mock('@aws-sdk/client-dynamodb', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    DynamoDBClient: vi.fn().mockImplementation(() => ({
      send: vi.fn(),
      destroy: vi.fn(),
    })),
  };
});

interface TestSession {
  version: number;
  value: string;
}

describe('DynamoDBSessionAdapter', () => {
  let adapter: DynamoDBSessionAdapter<TestSession>;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSend = vi.fn();
    vi.mocked(DynamoDBClient).mockImplementation(
      () => ({ send: mockSend, destroy: vi.fn() }) as unknown as DynamoDBClient,
    );
    adapter = new DynamoDBSessionAdapter({
      region: 'us-east-1',
      tenantId: 't1',
      botId: 'b1',
    });
  });

  describe('get', () => {
    it('returns null for missing key', async () => {
      mockSend.mockResolvedValue({ Item: undefined });
      const result = await adapter.get('missing');
      expect(result).toBeNull();
    });

    it('returns parsed session', async () => {
      mockSend.mockResolvedValue({
        Item: {
          pk: { S: 'session:t1:b1:k1' },
          sk: { S: 'k1' },
          value: { M: { version: { N: '2' }, value: { S: 'hello' } } },
          version: { N: '2' },
        },
      });
      const result = await adapter.get('k1');
      expect(result).toEqual({ version: 2, value: 'hello' });
    });
  });

  describe('set', () => {
    it('stores a session', async () => {
      mockSend.mockResolvedValue({});
      await expect(adapter.set('k1', { version: 1, value: 'data' })).resolves.toBeUndefined();
      expect(mockSend).toHaveBeenCalledOnce();
      const cmd = mockSend.mock.calls[0][0];
      expect(cmd).toBeInstanceOf(PutItemCommand);
    });
  });

  describe('delete', () => {
    it('deletes a session', async () => {
      mockSend.mockResolvedValue({});
      await expect(adapter.delete('k1')).resolves.toBeUndefined();
      expect(mockSend).toHaveBeenCalledOnce();
      const cmd = mockSend.mock.calls[0][0];
      expect(cmd).toBeInstanceOf(DeleteItemCommand);
    });
  });

  describe('getWithVersion', () => {
    it('returns version with value', async () => {
      mockSend.mockResolvedValue({
        Item: {
          pk: { S: 'session:t1:b1:k1' },
          sk: { S: 'k1' },
          value: { M: { version: { N: '3' }, value: { S: 'v3' } } },
          version: { N: '3' },
        },
      });
      const result = await adapter.getWithVersion('k1');
      expect(result).toEqual({ value: { version: 3, value: 'v3' }, version: 3 });
    });

    it('returns null when session not found', async () => {
      mockSend.mockResolvedValue({ Item: undefined });
      const result = await adapter.getWithVersion('missing');
      expect(result).toBeNull();
    });
  });

  describe('compareAndSet', () => {
    it('creates session when expectedVersion is 0 and no existing session', async () => {
      mockSend.mockResolvedValue({});
      const result = await adapter.compareAndSet('k1', 0, { version: 1, value: 'first' });
      expect(result).toEqual({ ok: true });
    });

    it('fails creation when session already exists (expectedVersion 0)', async () => {
      const conditionalError = new Error('ConditionalCheckFailedException');
      conditionalError.name = 'ConditionalCheckFailedException';
      // First send fails, then getWithVersion returns existing session
      mockSend
        .mockRejectedValueOnce(conditionalError)
        .mockResolvedValueOnce({
          Item: {
            pk: { S: 'session:t1:b1:k1' },
            sk: { S: 'k1' },
            value: { M: { version: { N: '1' }, value: { S: 'existing' } } },
            version: { N: '1' },
          },
        });
      const result = await adapter.compareAndSet('k1', 0, { version: 1, value: 'new' });
      expect(result.ok).toBe(false);
      expect(result.current).toBeDefined();
      expect(result.current!.version).toBe(1);
    });

    it('succeeds when version matches', async () => {
      mockSend.mockResolvedValue({});
      const result = await adapter.compareAndSet('k1', 1, { version: 2, value: 'updated' });
      expect(result).toEqual({ ok: true });
    });

    it('fails when version does not match', async () => {
      const conditionalError = new Error('ConditionalCheckFailedException');
      conditionalError.name = 'ConditionalCheckFailedException';
      mockSend
        .mockRejectedValueOnce(conditionalError)
        .mockResolvedValueOnce({
          Item: {
            pk: { S: 'session:t1:b1:k1' },
            sk: { S: 'k1' },
            value: { M: { version: { N: '2' }, value: { S: 'current' } } },
            version: { N: '2' },
          },
        });
      const result = await adapter.compareAndSet('k1', 1, { version: 3, value: 'should-fail' });
      expect(result.ok).toBe(false);
      expect(result.current!.version).toBe(2);
    });

    it('throws non-conditional errors', async () => {
      const otherError = new Error('NetworkError');
      mockSend.mockRejectedValueOnce(otherError);
      await expect(
        adapter.compareAndSet('k1', 0, { version: 1, value: 'x' }),
      ).rejects.toThrow('NetworkError');
    });
  });

  describe('destroy', () => {
    it('closes the DynamoDB client', () => {
      expect(() => adapter.destroy()).not.toThrow();
    });
  });
});
