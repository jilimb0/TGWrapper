# When Telegraf Stops Being Enough

Telegraf is a good framework. It has the largest Telegram-bot community in the TypeScript ecosystem, hundreds of tutorials, and a clean Express-like middleware model that gets you from zero to `/start` in minutes. This document is not an attack on Telegraf.

It is a description of the moment — usually around month three of a production bot — where the things Telegraf does not do start costing you real hours.

If you recognize the scenarios below, TGWrapper was designed for you.

---

## Scenario 1: You need 2+ bot instances and sessions break silently

Telegraf's built-in `session()` middleware stores state in-memory by default. When you plug in Redis, the standard adapter uses a simple `SET` — last write wins. This works fine with one process.

Run two instances behind a load balancer and the failure mode is silent: both instances read version N of the session, both mutate it, both write. One write overwrites the other. No error, no log, no indication anything went wrong — except a user whose cart just lost an item.

**What happens in Telegraf:**
```typescript
// Instance A reads session { items: ['a','b'], version: 3 }
// Instance B reads session { items: ['a','b'], version: 3 }

// Instance A: user adds 'c' → writes { items: ['a','b','c'] }
// Instance B: user removes 'b' → writes { items: ['a'] }

// Result: { items: ['a'] } — item 'c' is silently gone
```

**What TGWrapper does instead:**
```typescript
import { RedisSessionAdapter } from '@tgwrapper/adapter-redis';

const session = new RedisSessionAdapter({
  redis: redisInstance,
  tenantId: 'prod',
  botId: 'shop-bot'
});

bot.on('message', async (message) => {
  const result = await bot.updateSession(message.chat.id, (state) => {
    state.items.push('c');
  });

  if (!result.ok) {
    // CAS conflict — another instance modified this session.
    // Retry, merge, or tell the user. Never silent.
  }
});
```

The `RedisSessionAdapter` uses a Lua Compare-And-Swap (CAS) script. If the session version changed between your read and your write, the update fails explicitly with `ok: false`. You decide what to do — retry, merge, alert. The framework refuses to silently lose data.

---

## Scenario 2: A production incident with no trace

A user reports they tapped a button twice and got charged twice. You have two instances running. Your logs say:

```
[INFO] callback_query received
[INFO] payment processed
[INFO] callback_query received
[INFO] payment processed
```

Which instance handled which update? Were they the same `callback_query` or two different taps? What was the time delta? You cannot tell, because Telegraf does not emit trace IDs or structured event metadata by default. You are grepping timestamps and hoping.

**With TGWrapper's observability layer:**
```typescript
import { attachBotObservability, MetricsRegistry } from '@tgwrapper/observability';

const metrics = new MetricsRegistry();
attachBotObservability(bot, {
  metrics,
  logger: { log: (evt) => console.log(JSON.stringify(evt)) },
  serviceName: 'payment-bot',
  tenantId: 'prod',
  botId: 'payment-bot-v2',
});
```

Every update gets a UUID `traceId` propagated through `AsyncLocalStorage`. The same incident now looks like:

```json
{"traceId":"a1b2c3d4-...","event":"update.received","data":{"updateId":100,"updateType":"callback_query"}}
{"traceId":"a1b2c3d4-...","event":"update.processed","data":{"updateId":100,"durationMs":34}}
{"traceId":"e5f6a7b8-...","event":"update.received","data":{"updateId":101,"updateType":"callback_query"}}
{"traceId":"e5f6a7b8-...","event":"update.processed","data":{"updateId":101,"durationMs":29}}
```

Two different `updateId`s, two different traces. The user tapped twice. The deduplication guard you forgot to add is the bug — and now you can see it.

---

## Scenario 3: Self-rolled rate limiting breaks under burst

The common Telegraf pattern for rate limiting:

```typescript
const userCounts = new Map<number, number>();

bot.use((ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) return next();
  const count = userCounts.get(userId) || 0;
  if (count > 20) return ctx.reply('Slow down.');
  userCounts.set(userId, count + 1);
  return next();
});

// Reset counts every minute
setInterval(() => userCounts.clear(), 60_000);
```

This works on one instance. With two instances, each has its own `Map`. A user gets 20 requests per instance — 40 total. With three instances, 60. The limit scales with your infrastructure instead of constraining the user.

**TGWrapper's distributed rate limiter:**
```typescript
import { RedisKvStore, createRateLimiter } from '@tgwrapper/adapter-redis';

const kv = new RedisKvStore({ redisUrl: process.env.REDIS_URL!, prefix: 'mybot' });
const limiter = createRateLimiter(kv, {
  namespace: 'spam-guard',
  windowMs: 60_000,
  limit: 20,
  blockDurationMs: 30_000
});
```

The limiter uses a Redis sorted-set sliding window evaluated atomically in a single Lua call. The count is shared across all instances. Breach the limit and a block key is set for `blockDurationMs` — rejected instantly, no computation wasted.

---

## Scenario 4: Your AI bot needs token visibility

You are calling OpenAI from a Telegraf handler. The call takes 3 seconds, consumes 1,200 tokens, and you have no span wrapping it, no token count logged, no timeout contract. When the model hangs for 30 seconds on a bad prompt, the user sees nothing and your handler silently blocks.

**TGWrapper's AI tracing hooks:**
```typescript
import { ContextStore } from '@tgwrapper/observability';

bot.on('message', async (message) => {
  const context = ContextStore.getStore();

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'X-Correlation-ID': context?.traceId || '',  // end-to-end trace
    },
    signal: AbortSignal.timeout(10_000),  // hard timeout contract
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: message.text }]
    })
  });

  const data = await response.json();

  // Token usage is now part of the trace context
  context?.logger?.log({
    event: 'ai.completion',
    data: {
      model: 'gpt-4o',
      prompt_tokens: data.usage.prompt_tokens,
      completion_tokens: data.usage.completion_tokens,
      durationMs: Date.now() - start,
    }
  });
});
```

The `traceId` propagates from the Telegram update through the LLM call. You can correlate "user sent message X" → "model consumed Y tokens in Z ms" in a single log query.

---

## The transition

You do not need to rewrite your bot overnight. The practical path:

1. **Start with one handler.** Port your most painful handler — usually the one with session races or missing traces.
2. **Add Redis sessions.** Swap in `RedisSessionAdapter` and get CAS protection immediately.
3. **Attach observability.** One `attachBotObservability()` call gives you structured events and trace IDs across your entire bot.
4. **Migrate the rest gradually.** TGWrapper handlers are plain async functions. No class hierarchies to learn.

See [Migration from Telegraf](./MIGRATION_FROM_TELEGRAF.md) for code translation recipes.

---

## Honest trade-offs

Telegraf has things TGWrapper does not:

- **Larger community and ecosystem.** More tutorials, more Stack Overflow answers, more middleware packages.
- **Express-like familiarity.** If your team thinks in `app.use()`, Telegraf's model is immediately intuitive.
- **Mature convenience helpers.** `ctx.reply()`, `ctx.replyWithPhoto()`, and similar shortcuts reduce boilerplate for simple bots.

TGWrapper trades breadth for depth. If your bot is a single process answering `/help`, Telegraf is genuinely easier. If your bot is a distributed system pretending to be a chat interface, TGWrapper gives you the primitives to operate it like one.
