# Why TGWrapper?

Telegraf and grammY are excellent starting points. They get you from zero to a working bot in minutes, and for many use cases that's exactly right. But when the bot becomes a core service — handling real users, running across multiple instances, waking ops at 3 AM — you start building the missing pieces yourself: distributed sessions, rate limiting, structured logs, retry budgets. TGWrapper is the framework you reach for when you're done building those pieces by hand.

---

## 🚀 What gets easier with TGWrapper

| What you want to do | The hard way (Telegraf / grammY) | The TGWrapper way |
| :--- | :--- | :--- |
| **Run multiple instances** | Write custom Redis locking or accept session overwrites | Built-in Compare-and-Swap (CAS) session adapter |
| **Debug a user incident** | Grep unstructured text logs across multiple servers | Filter by automatically propagated `trace_id` |
| **Protect your API limits** | Roll custom `Map`-based limits that fail on 2+ nodes | Distributed sliding-window limiter via Redis ZSETs |
| **Build AI-native features** | Manual async tracking, no deadline controls | AsyncLocalStorage trace scopes, token metrics, AbortSignals |

---

## The pain that brings you here

If you've run a production Telegram bot for any length of time, some of these will sound familiar:

- **Duplicate sends from webhook retries.** Telegram re-delivers the update because your handler took longer than the 5-second budget. No idempotency guard, no abort signal — the user gets two messages.
- **No trace IDs, no structured logs.** A user reports a bug. You `grep` through stdout and try to correlate timestamps across three services. There are no span IDs, no `update_id` bindings, no way to follow one update through the system.
- **Self-rolled rate limiting.** You wrote a per-user cooldown with `Map<string, number>`. It works on one instance. On two instances behind a load balancer, users hit the limit on one pod and bypass it on the other.
- **Session conflicts at scale.** Two instances read the same session, both modify it, last write wins. The user's conversation state silently resets. You don't even know it happened.
- **AI bots with no token visibility.** Your bot calls an LLM, but you have no per-request token counts, no tool-call tracing, and no way to set a timeout that actually propagates through the handler chain.
- **Outgrowing the framework without a migration path.** You've wrapped Telegraf in so many custom middlewares that upgrading it would mean rewriting the wrappers too.

---

## The one-line answer

> **TGWrapper: a TypeScript framework for production Telegram bots with Redis state, observability, and reliability semantics built in.**

Not faster hello-world. Not more plugins. The value is in the layer between your handler logic and the infrastructure — the layer most teams end up building themselves.

---

## Three things that are architecture, not add-ons

### 1. Distributed state that is race-safe by design

TGWrapper's `RedisSessionAdapter` uses Compare-and-Swap (CAS) via Lua scripts. Every session carries a `version` field. When you write, the adapter only commits if the version hasn't changed since your read. If another instance wrote first, you get a conflict signal — not a silent overwrite.

```typescript
import { createBotClient } from '@jilimb0/tgwrapper';
import { RedisSessionAdapter } from '@jilimb0/tgwrapper-adapter-redis';

interface OrderSession {
  version: number;
  state: 'idle' | 'confirming' | 'paid';
  orderId?: string;
}

const sessionAdapter = new RedisSessionAdapter<OrderSession>({
  redisUrl: process.env.REDIS_URL!,
  tenantId: 'acme',
  botId: 'order-bot',
  ttlSeconds: 86400,
});

const bot = createBotClient({
  token: process.env.BOT_TOKEN!,
  mode: 'webhook',
  session: {
    store: sessionAdapter,
    initialState: () => ({ version: 1, state: 'idle' }),
  },
});

bot.on('message', async (message) => {
  if (!('text' in message) || message.text !== '/confirm') return;
  const chatId = message.chat.id;

  // Atomic state transition — CAS prevents two instances from
  // both moving the order to 'confirming' simultaneously.
  await bot.updateSession<OrderSession>(chatId, (session) => {
    if (session.state !== 'idle') return; // guard
    session.state = 'confirming';
    session.orderId = crypto.randomUUID();
  });

  await bot.sendMessage(chatId, 'Order created. Reply /pay to complete.');
});
```

**Contrast with Telegraf:** Telegraf's built-in session middleware stores state in-process memory. If you run two instances behind a load balancer, each holds a different copy of the session. There is no conflict detection — the last instance to reply silently wins.

---

### 2. Structured telemetry from the first update

Every update processed by TGWrapper gets a correlation context — `trace_id`, `span_id`, `update_id`, `chat_id`, `handler_name` — propagated via `AsyncLocalStorage`. You don't wire this up; it's there when you attach the observability package.

```typescript
import { attachBotObservability, MetricsRegistry } from '@jilimb0/tgwrapper-observability';

const metrics = new MetricsRegistry();
attachBotObservability(bot, {
  metrics,
  logger: {
    log: (event) => console.log(JSON.stringify(event)),
  },
  serviceName: 'order-bot',
});
```

Every log line produced during update processing includes structured fields:

```json
{
  "timestamp": "2026-06-04T20:14:33.012Z",
  "level": "info",
  "event": "update.processed",
  "trace_id": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
  "span_id": "1a2b3c4d5e6f7a8b",
  "update_id": 948172635,
  "chat_id": 123456789,
  "handler_name": "message",
  "duration_ms": 42,
  "service": "order-bot"
}
```

Filter by `trace_id` in Datadog, Kibana, or Loki and you see the full lifecycle of one update — from ingest through session load, handler execution, and API response. No custom middleware, no manual field injection.

**Contrast with Telegraf / grammY:** Neither ships with structured telemetry. You can add logging middleware, but you build the correlation context, propagation, and field schema yourself.

---

### 3. Reliability contracts, not hope

TGWrapper encodes reliability semantics that most frameworks leave as "exercise for the reader":

- **5-second webhook budget.** Telegram expects a response within ~5 seconds. TGWrapper passes an `AbortSignal` into handlers so long-running work (LLM calls, database queries) can respect the deadline instead of causing a retry storm.
- **At-least-once delivery awareness.** The framework is designed around the assumption that updates can be re-delivered. Session CAS and idempotency primitives make duplicate processing visible and handleable.
- **Fail-open / fail-closed Redis defaults.** If Redis is unreachable on startup, the bot refuses to start (fail-closed). If Redis drops mid-operation, the adapter surfaces the error instead of silently falling back to stale in-memory state.
- **Distributed sliding-window rate limiting.** Built on Redis sorted sets (`ZSET`), the rate limiter works correctly across multiple instances. No per-instance counters that diverge under load.

---

## Code: before and after

### Telegraf — webhook + session + logging (typical production setup)

```typescript
import { Telegraf, session } from 'telegraf';
import { createClient } from 'redis';

const bot = new Telegraf(process.env.BOT_TOKEN!);

// Session: in-memory (single instance only) or manual Redis wiring
bot.use(session());

// Logging: manual, no correlation
bot.use(async (ctx, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] update ${ctx.update.update_id}`);
  await next();
  console.log(`[${new Date().toISOString()}] done in ${Date.now() - start}ms`);
});

bot.on('message', async (ctx) => {
  // No typed session, no CAS, no trace context
  (ctx.session as any).count = ((ctx.session as any).count || 0) + 1;
  await ctx.reply(`Count: ${(ctx.session as any).count}`);
});

// Webhook: manual Express/Koa wiring required
// Rate limiting: roll your own
// Abort signal: not available
```

### TGWrapper — same feature set, built in

```typescript
import { createBotClient } from '@jilimb0/tgwrapper';
import { RedisSessionAdapter, RedisKvStore, createRateLimiter } from '@jilimb0/tgwrapper-adapter-redis';
import { attachBotObservability, MetricsRegistry } from '@jilimb0/tgwrapper-observability';

interface ChatSession { version: number; count: number; }

const sessionAdapter = new RedisSessionAdapter<ChatSession>({
  redisUrl: process.env.REDIS_URL!,
  tenantId: 'default',
  botId: 'counter-bot',
  ttlSeconds: 86400,
});

const bot = createBotClient({
  token: process.env.BOT_TOKEN!,
  mode: 'webhook',
  session: { store: sessionAdapter, initialState: () => ({ version: 1, count: 0 }) },
});

// Telemetry: trace_id, span_id, structured fields — automatic
attachBotObservability(bot, {
  metrics: new MetricsRegistry(),
  logger: { log: (e) => console.log(JSON.stringify(e)) },
  serviceName: 'counter-bot',
});

// Rate limiting: distributed, multi-instance safe
const store = new RedisKvStore({ redisUrl: process.env.REDIS_URL!, prefix: 'counter' });
const limiter = createRateLimiter(store, { namespace: 'chat', windowMs: 60_000, limit: 20, blockDurationMs: 15_000 });

bot.on('message', async (message) => {
  if (!('text' in message)) return;
  const chatId = message.chat.id;
  const userId = String(message.from?.id ?? chatId);

  const check = await limiter.check(`user:${userId}`);
  if (!check.allowed) return;

  // Typed session, CAS-protected atomic update
  await bot.updateSession<ChatSession>(chatId, (s) => { s.count += 1; });
  const session = await bot.getSession<ChatSession>(chatId);
  await bot.sendMessage(chatId, `Count: ${session.count}`);
});

await bot.start();
```

---

## Decision matrix: should I switch?

| Question | If yes → what TGWrapper gives you |
| :--- | :--- |
| Running 2+ bot instances? | Redis CAS sessions prevent silent state overwrites across instances |
| Debugged a duplicate send without trace IDs? | Every update gets a `trace_id` + `span_id` — filter one request across all logs |
| Building an AI-native bot? | Traces tool calls, tracks token usage, propagates abort signals for timeout budgets |
| Self-rolling rate limiting? | Distributed ZSET sliding-window limiter — correct across instances, zero custom code |
| Bot reliability tied to business outcomes? | Formal reliability semantics: fail-open/closed Redis, webhook budget, CAS conflicts |
| Spending more time on infra than features? | Session, telemetry, rate limiting are first-party — not middleware you maintain |

---

## What TGWrapper is NOT

Being clear about boundaries matters more than feature lists:

- **Not the fastest hello-world.** If you need a bot running in 5 minutes and 20 lines, Telegraf or grammY will get you there faster. TGWrapper's value shows up after the first deploy, not before.
- **Not for toy bots.** A personal reminder bot or a group welcome message doesn't need CAS sessions and distributed rate limiting. Use what's simple.
- **Not multi-platform.** TGWrapper is dedicated to the Telegram Bot API. No Discord adapter, no Slack bridge, no abstraction layer. Depth over breadth.
- **Not for non-TypeScript stacks.** TypeScript-first. No Python bindings, no Go port, no plans for either. If you're coming from `python-telegram-bot`, see the [migration guide](./MIGRATION_FROM_PYTHON.md).

---

## See also

- [When Telegraf stops being enough](./WHEN_TELEGRAF_STOPS.md)
- [Telegraf vs TGWrapper](./TELEGRAF_VS_TGWRAPPER.md)
- [grammY vs TGWrapper](./GRAMMY_VS_TGWRAPPER.md)
- [Migration from Telegraf](./MIGRATION_FROM_TELEGRAF.md)
- [Migration from grammY](./MIGRATION_FROM_GRMMY.md)
- [Migration from python-telegram-bot](./MIGRATION_FROM_PYTHON.md)
- [Adoption path](./ADOPTION_PATH.md)
