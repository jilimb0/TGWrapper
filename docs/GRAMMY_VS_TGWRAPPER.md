# grammY vs TGWrapper - easy first vs explicit operations

grammY and TGWrapper occupy different points on the same spectrum. grammY optimizes for getting started fast and staying productive with a rich plugin ecosystem. TGWrapper optimizes for distributed sessions, structured traces, and explicit failure contracts. Both are valid choices. This document helps you pick the right one for your situation.

---

## Where grammY wins

**Beginner DX.** grammY's `bot.command()`, `bot.on("message:text")`, and `ctx.reply()` get a working bot running in under 20 lines. The filter system is expressive and well-documented. If your team is new to Telegram bots, grammY has a gentler learning curve.

**Plugin ecosystem.** Menus, conversations, inline query helpers, session adapters for a dozen backends, auto-retry, transformer functions — grammY's community has built plugins for most common patterns. TGWrapper's ecosystem is smaller and focused on production infrastructure (Redis, observability).

**Community and docs.** grammY has extensive guides, a dedicated website, an active Telegram group, and wide coverage on Stack Overflow. When you are stuck, answers are easy to find.

**Broad runtime support.** grammY runs on Deno, Node.js, and browsers. TGWrapper targets Node.js, Cloudflare Workers, and AWS Lambda — no Deno support.

---

## Where TGWrapper's design differs

These are not grammY bugs — they are design trade-offs grammY made for simplicity. TGWrapper made different trade-offs.

**Sessions: typical last-write-wins vs CAS.** grammY's standard session flow writes the session object back after your handler runs; storage behavior can vary by adapter and custom implementation. In common shared-state setups, concurrent writes need extra design to avoid last-write-wins behavior. TGWrapper's `RedisSessionAdapter` uses a Lua Compare-And-Swap script - if the version changed between read and write, the update returns `ok: false` and you handle it explicitly.

**Observability: plugin-based vs architectural.** In grammY, tracing and metrics are usually added with custom middleware or third-party integrations. TGWrapper includes an observability package built around structured events, update lifecycle hooks, `AsyncLocalStorage` context in supported Node.js profiles, and a `MetricsRegistry`.

**Rate limiting: outgoing helpers vs shared fleet limits.** grammY has strong outgoing retry tooling. TGWrapper's Redis rate limiter is aimed at incoming/shared fleet limits and uses an atomic sliding-window counter shared across instances.

**Reliability contracts.** TGWrapper publishes formal documents on what is and is not guaranteed — CAS semantics, failure modes when Redis is down, clock drift caveats. grammY's approach is more pragmatic and less explicit about edge-case behavior in distributed deployments.

---

## Side-by-side: adding Redis sessions

**grammY:**
```typescript
import { Bot, session } from "grammy";
import { RedisAdapter } from "@grammyjs/storage-redis";

const bot = new Bot(process.env.BOT_TOKEN!);

bot.use(session({
  initial: () => ({ clicks: 0 }),
  storage: new RedisAdapter({ instance: redisClient })
}));

bot.on("message", (ctx) => {
  ctx.session.clicks++;
  // ⚠️ If two instances handle the same user concurrently,
  //    one increment is silently lost. No error thrown.
});

bot.start();
```

**TGWrapper:**
```typescript
import { createBotClient } from "@tgwrapper/core";
import { RedisSessionAdapter } from "@tgwrapper/adapter-redis";

const sessionAdapter = new RedisSessionAdapter({
  redis: redisClient,
  tenantId: 'prod',
  botId: 'counter-bot'
});

const bot = createBotClient({
  token: process.env.BOT_TOKEN!,
  mode: 'polling',
  session: {
    store: sessionAdapter,
    initialState: () => ({ version: 1, clicks: 0 })
  }
});

bot.on('message', async (message) => {
  const result = await bot.updateSession(message.chat.id, (state) => {
    state.clicks += 1;
  });

  if (!result.ok) {
    // CAS conflict — version mismatch.
    // Retry with fresh state or inform the user.
  }
});

await bot.start();
```

More code. The extra lines are the explicit conflict contract you need when concurrent updates matter.

---

## Decision guide

| Your situation | Recommendation |
| :--- | :--- |
| Building your first Telegram bot | **grammY.** Better tutorials, faster onboarding, bigger community. |
| Single-instance hobby bot | **grammY.** Plugin ecosystem covers most needs with less code. |
| Need menu/conversation/inline UI abstractions | **grammY.** Its plugin ecosystem has mature solutions for these. |
| Running 2+ instances with shared user state | **TGWrapper.** CAS sessions prevent silent concurrent overwrites and surface conflicts. |
| Need structured traces and metrics in production | **TGWrapper.** Built-in, not bolted on. |
| AI/LLM bot with token tracking and timeout contracts | **TGWrapper.** Trace context propagates through external API calls. |
| Deploying to Cloudflare Workers or AWS Lambda | **Both work.** TGWrapper's core is fetch-native; grammY needs adapter shims. |
| Migrating a legacy Telegraf bot | **TGWrapper** if you need distributed ops; **grammY** if you need ecosystem breadth. |

---

## Not a competition

grammY and TGWrapper solve different problems at different scales. If you are happy on grammY and your bot runs on a single instance without state races or observability gaps — stay on grammY. It is a well-maintained, well-documented framework.

TGWrapper exists for the moment when your requirements shift from "make it work" to "make it predictable across instances, with traces, under load." When that moment comes, the [Migration from grammY](./MIGRATION_FROM_GRMMY.md) guide has code translation recipes.
