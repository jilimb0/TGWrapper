# Code Comparisons: TGWrapper vs. Telegraf vs. grammY

This document provides side-by-side code comparisons between **TGWrapper**, **Telegraf**, and **grammY** across 5 common production scenarios.

---

## 🧭 Scenario 1: Webhook Handler Integration

How each framework integrates with a Node.js HTTP server.

### Telegraf

Requires Express/Koa middleware adapter or a manual callback function.

```typescript
import { Telegraf } from 'telegraf';
import express from 'express';

const bot = new Telegraf(process.env.BOT_TOKEN!);
const app = express();

app.use(bot.webhookCallback('/secret-path'));
bot.telegram.setWebhook('https://mybot.com/secret-path');
app.listen(3000);
```

### grammY

Requires custom adapter framework wrappers (e.g., `@grammyjs/express`).

```typescript
import { Bot, webhookCallback } from 'grammy';
import express from 'express';

const bot = new Bot(process.env.BOT_TOKEN!);
const app = express();

app.use(express.json());
app.use('/secret-path', webhookCallback(bot, 'express'));
app.listen(3000);
```

### TGWrapper

Ships with native, platform-agnostic request/response handling.

```typescript
import { createBotClient } from '@tgwrapper/core';
import { createServer } from 'http';

const bot = createBotClient({
  token: process.env.BOT_TOKEN!,
  mode: 'webhook'
});

createServer(async (req, res) => {
  if (req.url === '/secret-path' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const update = JSON.parse(body);
      await bot.handleUpdate(update);
      res.writeHead(200);
      res.end('ok');
    });
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(3000);
```

---

## 🧭 Scenario 2: Stateful Counter (Concurrent Updates)

Updating a persistent count field. Shows how each handles concurrent writes (e.g., double-clicks).

### Telegraf

Uses last-write-wins (LWW) session updates. If two processes read at the same time, the first update is overwritten.

```typescript
import { Telegraf, session } from 'telegraf';

const bot = new Telegraf(process.env.BOT_TOKEN!);
bot.use(session()); // Default in-memory or Redis adapter

bot.on('message', async (ctx) => {
  // Silent overwrite risk under concurrency
  const count = (ctx.session as any).count || 0;
  (ctx.session as any).count = count + 1;
  await ctx.reply(`Count: ${(ctx.session as any).count}`);
});
```

### grammY

Uses last-write-wins (LWW). Session adapters read at update start and write back at the end.

```typescript
import { Bot, session } from 'grammy';

const bot = new Bot(process.env.BOT_TOKEN!);
bot.use(session({ initial: () => ({ count: 0 }) }));

bot.on('message', async (ctx) => {
  // Silent overwrite risk under concurrency
  ctx.session.count++;
  await ctx.reply(`Count: ${ctx.session.count}`);
});
```

### TGWrapper

Uses atomic Compare-and-Swap (CAS) session operations. Fails safely or retries if state changes.

```typescript
import { createBotClient } from '@tgwrapper/core';
import { RedisSessionAdapter } from '@tgwrapper/adapter-redis';

interface CounterSession { version: number; count: number; }

const sessionAdapter = new RedisSessionAdapter<CounterSession>({
  redisUrl: process.env.REDIS_URL!, tenantId: 'prod', botId: 'counter'
});

const bot = createBotClient({
  token: process.env.BOT_TOKEN!, mode: 'polling',
  session: { store: sessionAdapter, initialState: () => ({ version: 1, count: 0 }) }
});

bot.on('message', async (message) => {
  const chatId = message.chat.id;

  // CAS update: lock-free, atomic, concurrent-safe
  await bot.updateSession<CounterSession>(chatId, (s) => {
    s.count++;
  });

  const session = await bot.getSession<CounterSession>(chatId);
  await bot.sendMessage(chatId, `Count: ${session.count}`);
});
```

---

## 🧭 Scenario 3: Telemetry & Observability

Tracing execution times and logs with unique IDs per update.

### Telegraf

No built-in correlation context. Teams write custom middleware pipelines.

```typescript
import { Telegraf } from 'telegraf';
import { v4 as uuid } from 'uuid';

const bot = new Telegraf(process.env.BOT_TOKEN!);

bot.use(async (ctx, next) => {
  const traceId = uuid();
  const start = Date.now();
  console.log(`[${traceId}] Ingested update ${ctx.update.update_id}`);
  try {
    await next();
  } finally {
    console.log(`[${traceId}] Processed in ${Date.now() - start}ms`);
  }
});
```

### grammY

No built-in telemetry package. Custom middleware required for tracing integration.

```typescript
import { Bot } from 'grammy';
import { v4 as uuid } from 'uuid';

const bot = new Bot(process.env.BOT_TOKEN!);

bot.use(async (ctx, next) => {
  const traceId = uuid();
  ctx.api.config.use((prev, method, payload, signal) => {
    // Manually pass trace context to API headers if supported
    return prev(method, payload, signal);
  });
  await next();
});
```

### TGWrapper

Built-in structured telemetry and OTel-compatible context propagation.

```typescript
import { createBotClient } from '@tgwrapper/core';
import { attachBotObservability, MetricsRegistry } from '@tgwrapper/observability';

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'polling' });

attachBotObservability(bot, {
  metrics: new MetricsRegistry(),
  logger: { log: (e) => console.log(JSON.stringify(e)) }, // Structured JSON
  serviceName: 'my-bot'
});
// Every update execution automatically gets traceId, spanId, and latency tracking.
```

---

## 🧭 Scenario 4: Distributed Rate Limiting

Fair-use rate limiting running on multiple server instances.

### Telegraf

Only supports single-process in-memory rate limiting out-of-the-box (e.g. `telegraf-ratelimit`).

```typescript
import { Telegraf } from 'telegraf';
import rateLimit from 'telegraf-ratelimit';

const bot = new Telegraf(process.env.BOT_TOKEN!);
// Works on one server node, leaks across multiple nodes
bot.use(rateLimit({ window: 60000, limit: 10 }));
```

### grammY

Requires manually wiring up custom Redis clients to third-party rate limiters.

```typescript
import { Bot } from 'grammy';
import { limit } from '@grammyjs/ratelimiter';

const bot = new Bot(process.env.BOT_TOKEN!);
// grammY plugin (typically in-memory; Redis requires storage adapters)
bot.use(limit());
```

### TGWrapper

First-class sliding window Redis rate limiter, cluster-safe.

```typescript
import { createBotClient } from '@tgwrapper/core';
import { RedisKvStore, createRateLimiter } from '@tgwrapper/adapter-redis';

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'polling' });
const kv = new RedisKvStore({ redisUrl: process.env.REDIS_URL! });
const limiter = createRateLimiter(kv, {
  namespace: 'global-protection',
  windowMs: 60000,
  limit: 10,
  blockDurationMs: 30000
});

bot.on('message', async (message) => {
  const check = await limiter.check(`user:${message.from?.id}`);
  if (!check.allowed) return; // Drop spam
  await bot.sendMessage(message.chat.id, 'Received!');
});
```

---

## 🧭 Scenario 5: AI LLM Call with Timeout Context

Wrapping long-running AI completions with timeout abort bounds.

### Telegraf

No native integration for abort signaling. Webhook response might timeout while LLM runs.

```typescript
import { Telegraf } from 'telegraf';
import { OpenAI } from 'openai';

const bot = new Telegraf(process.env.BOT_TOKEN!);
const openai = new OpenAI();

bot.on('text', async (ctx) => {
  // If this takes >5 seconds, Telegram webhooks retry this update,
  // causing duplicate AI completions.
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: ctx.message.text }]
  });
  await ctx.reply(response.choices[0].message.content);
});
```

### grammY

No built-in webhook retry abort guards.

```typescript
import { Bot } from 'grammy';
import { OpenAI } from 'openai';

const bot = new Bot(process.env.BOT_TOKEN!);
const openai = new OpenAI();

bot.on('message:text', async (ctx) => {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: ctx.message.text }]
  });
  await ctx.reply(response.choices[0].message.content);
});
```

### TGWrapper

Injects AbortSignals and hooks trace contexts directly into async helper spans.

```typescript
import { createBotClient } from '@tgwrapper/core';
import { OpenAI } from 'openai';

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'polling' });
const openai = new OpenAI();

bot.on('message', async (message) => {
  if (!('text' in message) || !message.text) return;
  const chatId = message.chat.id;

  // Retrieve current execution context abort controller/signal
  // to terminate OpenAI query if webhook budget runs out
  const signal = bot.getUpdateAbortSignal(); 

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: message.text }]
  }, { signal });

  await bot.sendMessage(chatId, response.choices[0].message.content || '');
});
```
