# Plugin & Extension Model

TGWrapper is built on a clean core architecture that avoids heavy internal frameworks. Instead of a magic middleware chain, extension is achieved through simple interfaces and hooks.

This document details how to extend TGWrapper's functionality by writing custom session adapters, rate limiters, and telemetry plugins.

---

## 1. Session Storage Adapters

Session state is persisted using any database that implements the `SessionAdapter` interface exported by `@tgwrapper/core`.

### The Interface

```typescript
export interface SessionAdapter<T = any> {
  /**
   * Retrieves the session data for a given chatId.
   * Returns null if no session exists yet.
   */
  get(chatId: number): Promise<T | null>;

  /**
   * Commits the session data to storage.
   * Implementation MUST utilize Compare-and-Swap (CAS) or optimistic locking
   * using the `version` field to prevent silent state overwrite conflicts.
   *
   * @returns true if commit succeeded; false if a version conflict occurred.
   */
  compareAndSet(chatId: number, expectedVersion: number, data: T): Promise<boolean>;
}
```

### Implementing a Custom Adapter (e.g. MongoDB)

Here is a simplified outline of how you would write a MongoDB session adapter:

```typescript
import { SessionAdapter } from '@tgwrapper/core';
import { Collection } from 'mongodb';

export class MongoSessionAdapter<T extends { version: number }> implements SessionAdapter<T> {
  constructor(private collection: Collection) {}

  async get(chatId: number): Promise<T | null> {
    const doc = await this.collection.findOne({ _id: chatId });
    return doc ? (doc.data as T) : null;
  }

  async compareAndSet(chatId: number, expectedVersion: number, data: T): Promise<boolean> {
    const result = await this.collection.updateOne(
      { _id: chatId, 'data.version': expectedVersion },
      { $set: { data } }
    );
    return result.modifiedCount > 0;
  }
}
```

---

## 2. Rate Limiters

Custom rate limiting requires implementing the `RateLimiter` interface.

### The Interface

```typescript
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

export interface RateLimiter {
  /**
   * Checks rate limiting for a specific identifier key.
   */
  check(key: string): Promise<RateLimitResult>;
}
```

---

## 3. Telemetry and Logging Exporters

TGWrapper emits structured lifecycle events during update processing. You can attach custom trace exporters or loggers to these event streams.

### Event Streams

Every client emits the following events under normal execution:
- `update.received`: Fired as soon as raw payload hits the client.
- `session.loaded`: Fired after session adapter resolves the state.
- `session.saved`: Fired after the session changes are successfully committed.
- `update.processed`: Fired when handler execution finishes cleanly.
- `error`: Fired on unhandled callback failures.

### Wiring a Custom Exporter

```typescript
bot.on('update.received', (event) => {
  const context = bot.getCorrelationContext(); // Contains traceId, spanId
  myTelemetrySDK.sendSpanStart({
    name: 'update_lifecycle',
    traceId: context.traceId,
    spanId: context.spanId,
    attributes: { updateId: event.updateId }
  });
});

bot.on('update.processed', (event) => {
  const context = bot.getCorrelationContext();
  myTelemetrySDK.sendSpanEnd({
    spanId: context.spanId,
    durationMs: event.durationMs
  });
});
```

---

## 🚀 Guidelines for Publishing Community Plugins

If you build an adapter or rate limiter, please follow these guidelines to make it discoverable and robust:

1. **Package Naming:** Use the naming format `tgwrapper-adapter-[database]` or `tgwrapper-plugin-[name]`.
2. **Dependencies:** Mark `@tgwrapper/core` as a `peerDependency` in your `package.json` to prevent bundle duplication.
3. **Typing:** Distribute declaration files (`.d.ts`) alongside your compiled JavaScript.
4. **Validation:** Implement standard mock integration tests verifying that concurrent database mutations trigger version updates correctly.
