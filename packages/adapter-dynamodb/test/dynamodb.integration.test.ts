import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBSessionAdapter } from '../src/dynamodb-session-adapter.js';

interface Session {
  version: number;
  value: string;
}

const endpoint = process.env.DYNAMODB_ENDPOINT ?? 'http://127.0.0.1:8000';
const tableName = process.env.DYNAMODB_TABLE ?? 'tgwrapper-sessions';

// Integration tests require a running DynamoDB Local instance.
// To run: docker run -p 8000:8000 amazon/dynamodb-local
const isIntegration = !!process.env.RUN_DYNAMODB_INTEGRATION;

describe.runIf(isIntegration)('DynamoDBSessionAdapter integration', () => {
  let adapter: DynamoDBSessionAdapter<Session>;
  let client: DynamoDBClient;

  beforeAll(async () => {
    client = new DynamoDBClient({ endpoint, region: 'us-east-1' });
    // Create table if not exists
    try {
      const { CreateTableCommand } = await import('@aws-sdk/client-dynamodb');
      await client.send(
        new CreateTableCommand({
          TableName: tableName,
          KeySchema: [
            { AttributeName: 'pk', KeyType: 'HASH' },
            { AttributeName: 'sk', KeyType: 'RANGE' },
          ],
          AttributeDefinitions: [
            { AttributeName: 'pk', AttributeType: 'S' },
            { AttributeName: 'sk', AttributeType: 'S' },
          ],
          BillingMode: 'PAY_PER_REQUEST',
        }),
      );
    } catch {
      // table already exists
    }

    adapter = new DynamoDBSessionAdapter({
      endpoint,
      region: 'us-east-1',
      tableName,
      tenantId: 't1',
      botId: 'b1',
    });
  });

  afterAll(() => {
    adapter.destroy();
    client.destroy();
  });

  it('commits compareAndSet atomically', async () => {
    // Clean up
    await adapter.delete('u1');

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
