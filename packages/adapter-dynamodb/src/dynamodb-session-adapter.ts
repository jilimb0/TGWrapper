import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  DeleteItemCommand,
  type AttributeValue,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type {
  CasResult,
  DynamoDBAdapterOptions,
  SessionStorage,
  VersionedValue,
} from './types.js';
import { DEFAULT_TABLE_NAME } from './types.js';

const PK = 'pk';
const SK = 'sk';
const ATTR_VALUE = 'value';
const ATTR_VERSION = 'version';
const ATTR_TTL = 'ttl';

/**
 * DynamoDB session storage adapter implementing SessionStorage with CAS
 * via DynamoDB condition expressions.
 *
 * Session records are stored with a composite key:
 *   PK = "session:{tenantId}:{botId}"
 *   SK = "{key}"
 *
 * CAS is implemented using ConditionExpression:
 *   - Create: attribute_not_exists(PK) AND attribute_not_exists(SK)
 *   - Update: #version == :expectedVersion
 */
export class DynamoDBSessionAdapter<TSession extends { version: number }>
  implements SessionStorage<TSession>
{
  private readonly client: DynamoDBClient;
  private readonly tableName: string;
  private readonly pkPrefix: string;
  private readonly ttlSeconds: number;

  public constructor(options: DynamoDBAdapterOptions) {
    this.client =
      options.client ??
      new DynamoDBClient({
        region: options.region ?? 'us-east-1',
        ...(options.endpoint ? { endpoint: options.endpoint } : {}),
      });
    this.tableName = options.tableName ?? DEFAULT_TABLE_NAME;
    this.pkPrefix = `session:${options.tenantId}:${options.botId}`;
    this.ttlSeconds = options.ttlSeconds ?? 0;
  }

  public async get(key: string): Promise<TSession | null> {
    const result = await this.client.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: this.marshallKey(key),
      }),
    );

    if (!result.Item) {
      return null;
    }

    const item = unmarshall(result.Item) as Record<string, unknown>;
    return item[ATTR_VALUE] as TSession;
  }

  public async set(key: string, value: TSession): Promise<void> {
    const item: Record<string, AttributeValue> = marshall({
      [PK]: this.pk(key),
      [SK]: key,
      [ATTR_VALUE]: value,
      [ATTR_VERSION]: value.version,
      ...(this.ttlSeconds > 0 ? { [ATTR_TTL]: Math.floor(Date.now() / 1000) + this.ttlSeconds } : {}),
    } as Record<string, unknown>, { removeUndefinedValues: true });

    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: item,
      }),
    );
  }

  public async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteItemCommand({
        TableName: this.tableName,
        Key: this.marshallKey(key),
      }),
    );
  }

  public async getWithVersion(key: string): Promise<VersionedValue<TSession> | null> {
    const value = await this.get(key);
    if (!value) {
      return null;
    }
    return { value, version: value.version };
  }

  public async compareAndSet(
    key: string,
    expectedVersion: number,
    nextValue: TSession,
  ): Promise<CasResult<TSession>> {
    const rawItem: Record<string, unknown> = {
      [PK]: this.pk(key),
      [SK]: key,
      [ATTR_VALUE]: nextValue,
      [ATTR_VERSION]: nextValue.version,
    };

    if (this.ttlSeconds > 0) {
      rawItem[ATTR_TTL] = Math.floor(Date.now() / 1000) + this.ttlSeconds;
    }

    try {
      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: marshall(rawItem, { removeUndefinedValues: true }) as Record<string, AttributeValue>,
          ConditionExpression:
            expectedVersion === 0
              ? 'attribute_not_exists(#pk) AND attribute_not_exists(#sk)'
              : '#version = :expectedVersion',
          ExpressionAttributeNames: this.conditionExpressionNames(expectedVersion),
          ExpressionAttributeValues: this.conditionExpressionValues(expectedVersion) as Record<string, AttributeValue>,
        }),
      );
      return { ok: true };
    } catch (error: unknown) {
      if (isConditionalCheckFailed(error)) {
        const current = await this.getWithVersion(key);
        if (!current) {
          return { ok: false };
        }
        return { ok: false, current };
      }
      throw error;
    }
  }

  public destroy(): void {
    this.client.destroy();
  }

  private pk(key: string): string {
    return `${this.pkPrefix}:${key}`;
  }

  private marshallKey(key: string): Record<string, AttributeValue> {
    return marshall({ [PK]: this.pk(key), [SK]: key }) as Record<string, AttributeValue>;
  }

  private conditionExpressionNames(expectedVersion: number): Record<string, string> {
    if (expectedVersion === 0) {
      return { '#pk': PK, '#sk': SK };
    }
    return { '#version': ATTR_VERSION };
  }

  private conditionExpressionValues(expectedVersion: number): Record<string, AttributeValue> {
    if (expectedVersion === 0) {
      return {};
    }
    return { ':expectedVersion': marshall(expectedVersion) as unknown as AttributeValue };
  }
}

function isConditionalCheckFailed(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.name === 'ConditionalCheckFailedException' ||
      error.name === 'ConditionalCheckFailed'
    );
  }
  return false;
}
