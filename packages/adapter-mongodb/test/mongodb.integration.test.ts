import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoClient } from 'mongodb';
import { MongoDBSessionAdapter } from '../src/mongodb-session-adapter.js';

interface Session {
  version: number;
  value: string;
}

const connectionUrl = process.env.MONGODB_URL ?? 'mongodb://127.0.0.1:27017';
const dbName = process.env.MONGODB_DB ?? 'tgwrapper_test';

// Integration tests require a running MongoDB instance.
// To run: docker run -p 27017:27017 mongo:7
const isIntegration = !!process.env.RUN_MONGODB_INTEGRATION;

describe.runIf(isIntegration)('MongoDBSessionAdapter integration', () => {
  let adapter: MongoDBSessionAdapter<Session>;

  beforeAll(async () => {
    const client = new MongoClient(connectionUrl);
    await client.connect();
    const db = client.db(dbName);
    // Drop collection to start clean
    await db.dropCollection('tgwrapper_sessions').catch(() => {});
    adapter = new MongoDBSessionAdapter({
      db,
      tenantId: 't1',
      botId: 'b1',
    });
  });

  afterAll(async () => {
    await adapter.disconnect();
  });

  it('commits compareAndSet atomically', async () => {
    // Create
    const created = await adapter.compareAndSet('u1', 0, { version: 1, value: 'a' });
    expect(created.ok).toBe(true);

    // Conflict
    const fail = await adapter.compareAndSet('u1', 0, { version: 1, value: 'b' });
    expect(fail.ok).toBe(false);

    // Correct version succeeds
    const ok = await adapter.compareAndSet('u1', 1, { version: 2, value: 'c' });
    expect(ok.ok).toBe(true);

    // Verify persisted
    const finalValue = await adapter.get('u1');
    expect(finalValue?.value).toBe('c');
    expect(finalValue?.version).toBe(2);
  });

  it('supports full lifecycle: set, get, delete', async () => {
    await adapter.set('u2', { version: 1, value: 'lifecycle' });
    const got = await adapter.get('u2');
    expect(got?.value).toBe('lifecycle');

    await adapter.delete('u2');
    const missing = await adapter.get('u2');
    expect(missing).toBeNull();
  });
});
