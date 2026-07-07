import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MongoDBSessionAdapter } from '../src/mongodb-session-adapter.js';
import type { Collection, Db } from 'mongodb';

interface TestSession {
  version: number;
  value: string;
}

function createMockCollection(): Collection {
  return {
    findOne: vi.fn(),
    insertOne: vi.fn(),
    replaceOne: vi.fn(),
    deleteOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    createIndex: vi.fn(),
  } as unknown as Collection;
}

function createMockDb(coll?: Collection): Db {
  return {
    collection: vi.fn().mockReturnValue(coll ?? createMockCollection()),
  } as unknown as Db;
}

describe('MongoDBSessionAdapter', () => {
  let adapter: MongoDBSessionAdapter<TestSession>;
  let mockColl: Collection;

  beforeEach(() => {
    mockColl = createMockCollection();
    const mockDb = createMockDb(mockColl);
    adapter = new MongoDBSessionAdapter({
      db: mockDb,
      tenantId: 't1',
      botId: 'b1',
    });
  });

  describe('get', () => {
    it('returns null for missing key', async () => {
      vi.mocked(mockColl.findOne).mockResolvedValue(null);
      const result = await adapter.get('missing');
      expect(result).toBeNull();
    });

    it('returns parsed session', async () => {
      vi.mocked(mockColl.findOne).mockResolvedValue({
        _id: 'session:t1:b1:k1',
        value: { version: 2, value: 'hello' },
        version: 2,
      });
      const result = await adapter.get('k1');
      expect(result).toEqual({ version: 2, value: 'hello' });
    });
  });

  describe('set', () => {
    it('replaces with upsert', async () => {
      vi.mocked(mockColl.replaceOne).mockResolvedValue({} as never);
      await adapter.set('k1', { version: 1, value: 'data' });
      expect(mockColl.replaceOne).toHaveBeenCalledWith(
        { _id: 'session:t1:b1:k1' },
        { _id: 'session:t1:b1:k1', value: { version: 1, value: 'data' }, version: 1 },
        { upsert: true },
      );
    });
  });

  describe('delete', () => {
    it('deletes a session', async () => {
      vi.mocked(mockColl.deleteOne).mockResolvedValue({ deletedCount: 1 } as never);
      await adapter.delete('k1');
      expect(mockColl.deleteOne).toHaveBeenCalledWith({ _id: 'session:t1:b1:k1' });
    });
  });

  describe('getWithVersion', () => {
    it('returns version with value', async () => {
      vi.mocked(mockColl.findOne).mockResolvedValue({
        _id: 'session:t1:b1:k1',
        value: { version: 3, value: 'v3' },
        version: 3,
      });
      const result = await adapter.getWithVersion('k1');
      expect(result).toEqual({ value: { version: 3, value: 'v3' }, version: 3 });
    });

    it('returns null when session not found', async () => {
      vi.mocked(mockColl.findOne).mockResolvedValue(null);
      const result = await adapter.getWithVersion('missing');
      expect(result).toBeNull();
    });
  });

  describe('compareAndSet', () => {
    it('creates session when expectedVersion is 0 and no existing session', async () => {
      vi.mocked(mockColl.insertOne).mockResolvedValue({ acknowledged: true, insertedId: '' } as never);
      const result = await adapter.compareAndSet('k1', 0, { version: 1, value: 'first' });
      expect(result).toEqual({ ok: true });
    });

    it('fails creation when session already exists', async () => {
      const dupError = new Error('E11000 duplicate key');
      (dupError as Record<string, unknown>).code = 11000;
      vi.mocked(mockColl.insertOne).mockRejectedValueOnce(dupError);
      vi.mocked(mockColl.findOne).mockResolvedValue({
        _id: 'session:t1:b1:k1',
        value: { version: 1, value: 'existing' },
        version: 1,
      });

      const result = await adapter.compareAndSet('k1', 0, { version: 1, value: 'new' });
      expect(result.ok).toBe(false);
      expect(result.current).toBeDefined();
      expect(result.current!.version).toBe(1);
    });

    it('succeeds when version matches on update', async () => {
      vi.mocked(mockColl.findOneAndUpdate).mockResolvedValue({
        _id: 'session:t1:b1:k1',
        value: { version: 1, value: 'old' },
        version: 1,
      });
      const result = await adapter.compareAndSet('k1', 1, { version: 2, value: 'updated' });
      expect(result).toEqual({ ok: true });
    });

    it('fails when version does not match', async () => {
      vi.mocked(mockColl.findOneAndUpdate).mockResolvedValue(null);
      vi.mocked(mockColl.findOne).mockResolvedValue({
        _id: 'session:t1:b1:k1',
        value: { version: 2, value: 'current' },
        version: 2,
      });
      const result = await adapter.compareAndSet('k1', 1, { version: 3, value: 'should-fail' });
      expect(result.ok).toBe(false);
      expect(result.current!.version).toBe(2);
    });
  });
});
