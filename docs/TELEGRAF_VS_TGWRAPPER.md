# Telegraf vs TGWrapper — familiar middleware vs production contracts

Telegraf is the most widely used Telegram bot framework in the Node.js ecosystem. It has years of production mileage, a familiar Express-like middleware model, and the largest community. This document is a respectful, honest comparison — not a takedown.

TGWrapper was built for a different moment: when the bot stops being a side project and starts being a distributed system that you need to debug at 3 AM.

---

## Where Telegraf wins

**Community and ecosystem.** More tutorials, more Stack Overflow answers, more middleware packages than any other TypeScript Telegram framework. When you are stuck, answers are easy to find.

**Express-like familiarity.** If your team thinks in `app.use()`, `ctx.reply()`, and ordered middleware chains, Telegraf's model is immediately intuitive. Zero learning curve for Express/Koa developers.

**Convenience helpers.** `ctx.reply()`, `ctx.replyWithPhoto()`, `ctx.replyWithDocument()` — one-line methods that reduce boilerplate for simple bots.

**Proven stability.** Telegraf has been running in production since 2016. Many bots run for years without issues on a single instance.

---

## Where TGWrapper's design differs

These are design trade-offs, not bugs. Telegraf optimised for simplicity; TGWrapper optimised for distributed operations.

### Sessions: in-memory default vs CAS

Telegraf's `session()` middleware stores state in-process memory by default. When you plug in a Redis adapter, writes use a simple `SET` — last write wins. Two instances handling the same user concurrently will silently overwrite each other's state.

TGWrapper's `RedisSessionAdapter` uses a Lua Compare-And-Swap (CAS) script. If the session version changed between your read and your write, the update returns `ok: false`. You decide what to do — retry, merge, or alert. The framework refuses to silently lose data.

### Observability: manual vs architectural

Telegraf ships no structured telemetry. Adding trace IDs, structured logs, or metrics requires custom middleware you write and maintain. There is no update lifecycle hook system.

TGWrapper bakes observability into the update pipeline. `attachBotObservability()` gives you structured events, `AsyncLocalStorage` trace propagation, and a `MetricsRegistry` — one function call, zero custom middleware.

### Rate limiting: in-memory Map vs distributed counter

The common Telegraf pattern — `Map<number, number>` with `setInterval` clear — works on one instance. With two instances, the limit scales with your infrastructure instead of constraining the user. TGWrapper's Redis rate limiter uses an atomic sorted-set sliding window shared across all instances.

### Reliability contracts

TGWrapper publishes formal documentation on what is and is not guaranteed: CAS semantics, Redis failure modes (fail-open vs fail-closed), webhook timeout budget (5s), `AbortSignal` propagation. Telegraf's approach is pragmatic — it works, but edge-case behavior in distributed deployments is left to the developer.

---

## Side-by-side: session counter

### Telegraf

```typescript
import { Telegraf, session } from 'telegraf';

const bot = new Telegraf(process.env.BOT_TOKEN!);
bot.use(session()); // in-memory by default

bot.on('text', (ctx) => {
  ctx.session.counter = (ctx.session.counter || 0) + 1;
  ctx.reply(`Count: ${ctx.session.counter}`);
  // ⚠️ In-memory only. Restart = state gone.
  // ⚠️ With Redis adapter: last-write-wins under concurrency.
});

bot.launch();
```

### TGWrapper

```typescript
import { createBotClient } from '@jilimb0/tgwrapper';
import { RedisSessionAdapter } from '@jilimb0/tgwrapper-adapter-redis';

const sessionAdapter = new RedisSessionAdapter({
  redisUrl: process.env.REDIS_URL!,
  tenantId: 'prod',
  botId: 'counter-bot',
});

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'polling' });

bot.on('message', async (message) => {
  if (!('text' in message)) return;
  const chatId = message.chat.id;
  const key = `chat:${chatId}`;

  let session = await sessionAdapter.get(key);
  if (!session) session = { version: 1, counter: 0 };

  session.counter += 1;

  const result = await sessionAdapter.compareAndSet(key, session.version, {
    ...session,
    version: session.version + 1,
  });

  if (!result.ok) {
    // CAS conflict — another instance touched this session
  }

  await bot.sendMessage(chatId, `Count: ${session.counter}`);
});

await bot.start();
```

More code. But `result.ok` is the line that prevents silent data loss when your second pod boots.

---

## Decision guide

| Your situation | Recommendation |
| :--- | :--- |
| Single-instance bot, stable in production | **Stay on Telegraf.** It works. |
| Team thinks in Express middleware | **Telegraf.** Same mental model. |
| Need `ctx.reply()` convenience | **Telegraf.** TGWrapper uses explicit `bot.sendMessage(chatId, text)`. |
| Running 2+ instances with shared user state | **TGWrapper.** CAS sessions prevent silent data loss. |
| Need structured traces for production debugging | **TGWrapper.** Built-in, not bolted on. |
| Deploying to Cloudflare Workers or Lambda | **TGWrapper.** Fetch-native core, no Node server deps. |
| AI bot with LLM tracing and timeout contracts | **TGWrapper.** Trace context propagates through external API calls. |
| Migrating legacy Telegraf bot | Only if you're hitting distributed pain. See migration guide. |

---

## Honest trade-offs

| TGWrapper gains | TGWrapper loses |
| :--- | :--- |
| CAS-protected distributed sessions | Larger community and ecosystem |
| Built-in structured telemetry | Express-like `ctx.reply()` convenience |
| Distributed Redis rate limiting | Ordered middleware chain |
| Formal reliability contracts | Compatibility with Node.js < 18 |
| Edge/serverless-native core | Years of proven production stability |

---

## Bottom line

If your bot is a single process on a VPS, Telegraf is genuinely simpler and you should stay there. If your bot is a distributed system pretending to be a chat interface, TGWrapper gives you the primitives to operate it like one.

---

## Next steps

- [When Telegraf stops being enough](./WHEN_TELEGRAF_STOPS.md) — four real scenarios where Telegraf becomes a liability
- [Migration from Telegraf](./MIGRATION_FROM_TELEGRAF.md) — code translation recipes and minimal-downtime migration plan
- [Comparison Matrix](./COMPARISON.md) — all three frameworks side-by-side
