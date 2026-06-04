# Failure Drills & System Resilience

This document outlines how the TGWrapper framework behaves during critical operational failures, detailing symptom signatures, internal framework recovery logic, and recommended application code recovery patterns.

---

## 🌪️ Resilience Summary

| Failure Mode | Internal Logic / Behavior | Recovery Strategy |
| :--- | :--- | :--- |
| **Telegram API 429** | Ingests response headers, extracts `retry_after`, pauses request queue | Auto-backs off. App should catch, throttle, and log correlation ID |
| **Telegram API 5xx** | Retries update delivery with exponential backoff up to limit | Fails requests gracefully. App handles state rollback on FSM |
| **Redis Network Down** | Connection state changes to reconnect; session reads fail immediately | Configure retry client logic; fallback to read-only memory caches |
| **Duplicate Updates** | Update identifier evaluated against active CAS session cache | Lua atomic lock drops duplicates, logging `session.conflict` |
| **Handler Timeouts** | Update processing context aborted if threshold is breached | Use AbortSignal to interrupt pending AI or database operations |

---

## 1. Telegram API 429 (Rate Limit Exceeded)

### Symptoms
- Responses from Telegram API endpoints return HTTP Status Code `429`.
- Response JSON body contains payload field `parameters: { retry_after: N }`.
- Outbound updates queue backs up; system memory usage rises.

### Framework Mechanism
TGWrapper clients track rate limiting metrics. If a `429` is detected, the internal request dispatcher:
1. Blocks execution of outgoing calls for that token block.
2. Respects the exact duration in seconds returned in `retry_after`.
3. Re-enables the dispatcher queue immediately after the timeout expire epoch.

### Operational Recovery Pattern
Ensure your client middleware wraps outgoing message loops in try-catch triggers to log telemetry correlation:
```typescript
try {
  await bot.sendMessage(chatId, "Important notification");
} catch (error: any) {
  if (error.statusCode === 429) {
    logger.warn({
      event: "rate_limit.exceeded",
      retryAfterSeconds: error.retryAfter,
      traceId: bot.currentTraceId
    }, "Telegram API rate limit hit. Pausing queue.");
  }
}
```

---

## 2. Telegram API 5xx (Server Error / Outages)

### Symptoms
- Requests time out or return HTTP Status Codes `500`, `502`, `503`, or `504`.
- Telegram webhook intake endpoints cannot resolve.

### Framework Mechanism
- **Polling:** The polling loop logs the failure event, waits for a backoff duration (defaulting to 1 second, increasing exponentially to a maximum of 30 seconds), and restarts the long-polling HTTP call.
- **Webhooks:** The ingest server passes the failure code back to the Telegram webhook server, allowing Telegram to retry sending the update later.

### Operational Recovery Pattern
Ensure your bot handler functions are idempotent. If a write fails midway through execution, state can rollback:
```typescript
bot.on('message', async (ctx) => {
  const transaction = await db.beginTransaction();
  try {
    await ctx.session.update((state) => { state.step = 'confirmed'; });
    await bot.sendMessage(ctx.chat.id, "Saved!");
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    // Session state rolls back on atomic CAS conflict block
    throw error; 
  }
});
```

---

## 3. Redis Adapter Disconnection

### Symptoms
- Redis write or read calls throw connection timeout exceptions.
- Observability logs emit `session.error` and `ratelimit.error` events.
- Session values fallback to defaults or fail to resolve.

### Framework Mechanism
If the connection to Redis drops:
- `@jilimb0/tgwrapper-adapter-redis` relies on `ioredis` internal reconnection loop.
- During the reconnect window, any call to load session data or evaluate rate limits will immediately fail or reject, avoiding silent corruption or state bypass.
- The framework does **not** silently fallback to in-memory storage, preventing split-brain data states where different instances have diverging versions of user sessions.

### Operational Recovery Pattern
Initialize your Redis adapter client with explicit timeout limits and reconnect rules:
```typescript
import Redis from 'ioredis';
import { RedisSessionAdapter } from '@jilimb0/tgwrapper-adapter-redis';

const redisClient = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay; // Retry up to 3s backoff
  }
});

const session = new RedisSessionAdapter({ redis: redisClient });
```

---

## 4. Duplicate Updates (At-Least-Once Delivery Safeguard)

### Symptoms
- Telegram webhook retries deliver the identical `update_id` multiple times.
- Parallel worker processes handle the same message simultaneously, triggering duplicate API replies.

### Framework Mechanism
- The session adapter uses an atomic CAS Lua script writing session state version increments (`version: N -> N+1`).
- If an update with an identical sequence attempts a concurrent write, the Lua check returns `{ ok: false, conflict: true }`.
- The update handler intercepts the conflict, logs a structured `session.conflict` warning event, and drops the duplicate update processing cycle immediately.

---

## 5. Slow Handler Execution (Timeouts)

### Symptoms
- Edge workers execute past execution limit budgets (e.g., 10s on Cloudflare Workers, 30s on webhooks).
- Observability traces display long spans on `ai_generation` with no completion event.

### Framework Mechanism
TGWrapper injects an `AbortSignal` into each update processing context. 

### Operational Recovery Pattern
Attach context abort bounds to downstream long-running tasks:
```typescript
bot.on('message', async (ctx) => {
  const signal = ctx.signal; // AbortSignal bound to update lifetime
  
  const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({ model: 'gpt-4o', messages: [...] }),
    signal // Closes connection if context times out
  });
  
  await ctx.reply(aiResponse.choices[0].message.content);
});
```
