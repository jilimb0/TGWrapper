import { MongoClient, type Db, type Collection } from 'mongodb';
import type {
  CasResult,
  MongoDBAdapterOptions,
  SessionStorage,
  VersionedValue,
} from './types.js';
import { DEFAULT_COLLECTION_NAME } from './types.js';

const FIELD_KEY = '_id';
const FIELD_VALUE = 'value';
const FIELD_VERSION = 'version';
const FIELD_TTL = 'ttl';

interface SessionDocument<TSession> {
  _id: string;
  value: TSession;
  version: number;
  ttl?: number;
}

/**
 * MongoDB session storage adapter implementing SessionStorage with CAS
 * via findOneAndUpdate with a version filter.
 *
 * Session documents use the session key as _id.
 * CAS uses a filter on the version field:
 *   - Create: insertOne (fails with duplicate key if exists)
 *   - Update: { _id: key, version: expectedVersion } — atomic version check
 *
 * Documents use a configurable TTL index on the 'ttl' field for automatic expiry.
 */
export class MongoDBSessionAdapter<TSession extends { version: number }>
  implements SessionStorage<TSession>
{
  private readonly client: MongoClient | null;
  private readonly collection: Promise<Collection<SessionDocument<TSession>>>;
  private readonly keyPrefix: string;
  private readonly ttlSeconds: number;

  public constructor(options: MongoDBAdapterOptions) {
    this.keyPrefix = `session:${options.tenantId}:${options.botId}`;
    this.ttlSeconds = options.ttlSeconds ?? 0;

    if (options.db) {
      this.client = null;
      this.collection = Promise.resolve(
        options.db.collection<SessionDocument<TSession>>(
          options.collectionName ?? DEFAULT_COLLECTION_NAME,
        ),
      );
    } else if (options.connectionUrl && options.dbName) {
      this.client = new MongoClient(options.connectionUrl);
      this.collection = this.initCollection(options.dbName, options.collectionName);
    } else {
      throw new Error('Either db or connectionUrl + dbName must be provided');
    }
  }

  public async get(key: string): Promise<TSession | null> {
    const coll = await this.collection;
    const doc = await coll.findOne({ [FIELD_KEY]: this.fullKey(key) });
    return doc?.value ?? null;
  }

  public async set(key: string, value: TSession): Promise<void> {
    const coll = await this.collection;
    const doc: SessionDocument<TSession> = {
      _id: this.fullKey(key),
      value,
      version: value.version,
    };
    if (this.ttlSeconds > 0) {
      doc[FIELD_TTL] = Math.floor(Date.now() / 1000) + this.ttlSeconds;
    }
    await coll.replaceOne({ [FIELD_KEY]: doc._id }, doc, { upsert: true });
  }

  public async delete(key: string): Promise<void> {
    const coll = await this.collection;
    await coll.deleteOne({ [FIELD_KEY]: this.fullKey(key) });
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
    const coll = await this.collection;
    const fullKey = this.fullKey(key);

    if (expectedVersion === 0) {
      // Create: insert if not exists
      const doc: SessionDocument<TSession> = {
        _id: fullKey,
        value: nextValue,
        version: nextValue.version,
      };
      if (this.ttlSeconds > 0) {
        doc[FIELD_TTL] = Math.floor(Date.now() / 1000) + this.ttlSeconds;
      }

      try {
        await coll.insertOne(doc);
        return { ok: true };
      } catch (error: unknown) {
        if (isDuplicateKey(error)) {
          const current = await this.getWithVersion(key);
          if (!current) return { ok: false };
          return { ok: false, current };
        }
        throw error;
      }
    }

    // Update: atomic version check
    const update: Partial<SessionDocument<TSession>> = {
      [FIELD_VALUE]: nextValue,
      [FIELD_VERSION]: nextValue.version,
    };
    if (this.ttlSeconds > 0) {
      update[FIELD_TTL] = Math.floor(Date.now() / 1000) + this.ttlSeconds;
    }

    const result = await coll.findOneAndUpdate(
      { [FIELD_KEY]: fullKey, [FIELD_VERSION]: expectedVersion },
      { $set: update },
      { returnDocument: 'before' },
    );

    if (result) {
      return { ok: true };
    }

    // Version mismatch — return current state
    const current = await this.getWithVersion(key);
    if (!current) return { ok: false };
    return { ok: false, current };
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }

  private fullKey(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }

  private async initCollection(
    dbName: string,
    collectionName?: string,
  ): Promise<Collection<SessionDocument<TSession>>> {
    await this.client!.connect();
    const db = this.client!.db(dbName);
    const coll = db.collection<SessionDocument<TSession>>(
      collectionName ?? DEFAULT_COLLECTION_NAME,
    );

    // Ensure TTL index if TTL is configured
    if (this.ttlSeconds > 0) {
      try {
        await coll.createIndex({ [FIELD_TTL]: 1 }, { expireAfterSeconds: 0, background: true });
      } catch {
        // index likely already exists
      }
    }

    return coll;
  }
}

function isDuplicateKey(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      (error as { code?: number }).code === 11000 ||
      error.message.includes('duplicate key') ||
      error.message.includes('E11000')
    );
  }
  return false;
}
