# Tutorials — Learn TGWrapper Step by Step

A structured learning path from your first bot to a production AI assistant. Each tutorial builds on the previous one, but you can jump to any level that matches your current needs.

---

## Learning Path

| # | Tutorial | What you build | Time | Prerequisites |
| :--- | :--- | :--- | :--- | :--- |
| 1 | [First bot](#1-first-bot) | Echo bot with `/start` | 5 min | Node.js, Telegram account |
| 2 | [Commands and handlers](#2-commands-and-handlers) | Multi-command bot with buttons | 15 min | Tutorial 1 |
| 3 | [Persistent sessions](#3-persistent-sessions) | Multi-step registration flow with Redis | 20 min | Tutorial 2, Redis running |
| 4 | [Structured telemetry](#4-structured-telemetry) | Traced bot with structured JSON logs | 10 min | Tutorial 3 |
| 5 | [Webhook + serverless](#5-webhook--serverless) | Bot deployed to serverless | 20 min | Tutorial 4 |
| 6 | [Multi-instance scaling](#6-multi-instance-scaling) | Distributed rate limiting across instances | 15 min | Tutorial 5 |
| 7 | [AI-native bot](#7-ai-native-bot) | GPT-powered conversation bot | 25 min | Tutorial 4, OpenAI key |

---

## 1. First bot

**Goal:** A running Telegram bot that echoes messages.

**What you'll learn:** `createBotClient`, `bot.on('message')`, `bot.sendMessage()`, `bot.start()`

**Follow:** [Quick Start](./QUICK_START.md)

**Example:** [polling-starter](../examples/polling-starter)

---

## 2. Commands and handlers

**Goal:** A bot that handles `/start`, `/help`, `/info` commands and inline keyboard buttons.

**What you'll learn:** Command routing patterns, `bot.on('callback_query')`, `answerCallbackQuery`, inline keyboard markup

**Key pattern:**
```typescript
bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') return;
  const chatId = message.chat.id;

  switch (message.text) {
    case '/start': return await bot.sendMessage(chatId, 'Welcome!');
    case '/help': return await bot.sendMessage(chatId, 'Commands: /start, /help');
    default: await bot.sendMessage(chatId, `Echo: ${message.text}`);
  }
});

bot.on('callback_query', async (cb) => {
  await bot.answerCallbackQuery(cb.id, { text: `Tapped: ${cb.data}` });
});
```

**Example:** [polling-starter](../examples/polling-starter)

---

## 3. Persistent sessions

**Goal:** A multi-step registration flow where user state survives bot restarts.

**What you'll learn:** `RedisSessionAdapter`, `session.get()`, `session.compareAndSet()`, typed session state, CAS conflict handling

**You'll add:**
```bash
pnpm add @jilimb0/tgwrapper-adapter-redis ioredis
```

**Key concept:** Sessions use Compare-and-Swap (CAS) — if another instance modified the session between your read and write, you get `ok: false` instead of silent data loss.

**Example:** [multi-instance-redis-starter](../examples/multi-instance-redis-starter)

**Deep dive:** [Redis Runtime Guide](./REDIS_RUNTIME.md)

---

## 4. Structured telemetry

**Goal:** Every update gets a `traceId`, structured log events, and pull-based metrics.

**What you'll learn:** `attachBotObservability`, `MetricsRegistry`, `getCorrelationContext()`, structured JSON log format

**You'll add:**
```bash
pnpm add @jilimb0/tgwrapper-observability
```

**Key pattern:**
```typescript
import { attachBotObservability, MetricsRegistry } from '@jilimb0/tgwrapper-observability';

const metrics = new MetricsRegistry();
attachBotObservability(bot, {
  metrics,
  logger: { log: (evt) => console.log(JSON.stringify(evt)) },
  serviceName: 'my-bot',
});
```

**Result:** Your logs now contain `traceId`, `updateId`, `chatId`, `durationMs` — filter one user's journey in a single log query.

**Deep dive:** [Telemetry Reference](./TELEMETRY_REFERENCE.md)

---

## 5. Webhook + serverless

**Goal:** Switch from polling to webhook mode and deploy to a serverless runtime.

**What you'll learn:** `mode: 'webhook'`, `bot.ingest(update)`, HTTP request handler patterns for Node.js / Lambda / Cloudflare Workers

**Key change:**
```typescript
const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'webhook' });
```

Same handlers. Same session. Same telemetry. One config flag changes the transport.

**Examples:**
- [serverless-webhook-starter](../examples/serverless-webhook-starter)
- [AWS Lambda](../examples/aws-lambda)
- [Cloudflare Worker](../examples/cloudflare-worker)
- [Node HTTP](../examples/node-http)

---

## 6. Multi-instance scaling

**Goal:** Run 2+ bot instances with shared rate limiting and safe concurrent sessions.

**What you'll learn:** `RedisKvStore`, `createRateLimiter`, distributed sliding-window pattern, CAS retry strategies

**Key pattern:**
```typescript
import { RedisKvStore, createRateLimiter } from '@jilimb0/tgwrapper-adapter-redis';

const kv = new RedisKvStore({ redisUrl: process.env.REDIS_URL!, prefix: 'my-bot' });
const limiter = createRateLimiter(kv, {
  namespace: 'user-limit', windowMs: 60_000, limit: 20, blockDurationMs: 30_000,
});
```

**Example:** [multi-instance-redis-starter](../examples/multi-instance-redis-starter)

**Deep dive:** [Redis Topologies](./REDIS_TOPOLOGIES.md) · [Failure Modes](./REDIS_FAILURE_MODES.md)

---

## 7. AI-native bot

**Goal:** A conversational bot powered by OpenAI with multi-turn history, token tracking, and traced LLM calls.

**What you'll learn:** `Tracer.withSpan()`, `getCorrelationContext()`, conversation history in Redis sessions, `AbortSignal.timeout()` for LLM timeout contracts, token usage metrics

**This combines everything:** Redis sessions for conversation state, observability for LLM tracing, rate limiting for token budget protection, timeout contracts for reliability.

**Example:** [ai-bot-starter](../examples/ai-bot-starter) — full runnable reference with echo fallback

---

## How to use this path

- **New to TGWrapper?** Start at Tutorial 1 and work forward.
- **Coming from Telegraf/grammY?** Start at Tutorial 3 (sessions) — you already know commands.
- **Building an AI bot?** Jump to Tutorial 7, but read Tutorial 4 (telemetry) first.
- **Deploying to serverless?** Tutorials 1 → 5 is the shortest path.

Each tutorial links to a runnable example you can clone and modify.

---

## See also

- [Quick Start](./QUICK_START.md) — fastest path to a running bot
- [Grow with TGWrapper](./GROW_WITH_TGWRAPPER.md) — staged adoption narrative
- [Example projects](../examples/) — all runnable reference implementations
- [Bot Development Guide](./BOT_DEVELOPMENT_GUIDE.md) — full API reference
