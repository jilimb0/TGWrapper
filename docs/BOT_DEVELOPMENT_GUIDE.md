# Bot Development Guide

This guide shows the fastest path to a production-ready bot using TGWrapper.

## Prerequisites

- Node.js 20+
- pnpm 10+
- Telegram bot token from BotFather

## 1) Install packages

```bash
pnpm add @tgwrapper/core @tgwrapper/adapter-redis @tgwrapper/observability
```

## 2) Create a 5-minute bot (polling)

Create `src/bot.ts`:

```ts
import { createBotClient } from '@tgwrapper/core';

const bot = createBotClient({
  token: process.env.BOT_TOKEN!,
  mode: 'polling',
  polling: { timeoutSeconds: 30, limit: 100 }
});

bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') {
    return;
  }

  if (message.text === '/start') {
    await bot.sendMessage(message.chat.id, 'Bot is ready.');
    return;
  }

  await bot.sendMessage(message.chat.id, `Echo: ${message.text}`);
});

bot.on('callback_query', async (callback) => {
  await bot.answerCallbackQuery(callback.id, { text: 'Received' });
});

bot.on('error', (error) => {
  console.error('Bot runtime error', error);
});

await bot.start();
```

Run:

```bash
BOT_TOKEN="<your_token>" node --import tsx src/bot.ts
```

## 3) Webhook mode

Use `mode: 'webhook'` and call `bot.ingest(update)` from your HTTP handler:

```ts
import { createBotClient } from '@tgwrapper/core';

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'webhook' });

await bot.start();

export async function handleWebhookRequest(update: unknown): Promise<void> {
  bot.ingest(update);
}
```

## 4) High-level API methods (typed)

Use typed wrappers as default path:

- `bot.sendMessage(...)`
- `bot.sendDocument(...)`
- `bot.answerCallbackQuery(...)`
- `bot.editMessageText(...)`
- `bot.editMessageReplyMarkup(...)`
- `bot.getFileLink(...)`

Use raw `callApiUnsafe` only as escape hatch.

## 5) Redis cache + rate limit

For production multi-instance deployments, prefer Redis-backed distributed rate limiting. The core in-memory limiter is suitable for local development and single-instance setups only.

```ts
import { RedisKvStore, createRateLimiter } from '@tgwrapper/adapter-redis';

const kv = new RedisKvStore({ redisUrl: process.env.REDIS_URL!, prefix: 'mybot' });
const cache = kv.createCacheNamespace('cache');
const limiter = createRateLimiter(kv, {
  namespace: 'spam',
  windowMs: 60_000,
  limit: 20,
  blockDurationMs: 30_000
});

const state = await limiter.check('user:123');
if (!state.allowed) {
  console.log('Retry after (sec):', state.retryAfter);
}

await cache.setJson('profile:123', { language: 'en' }, 3600);
```

## 6) Observability in one step

```ts
import { EcsJsonLogger, InMemoryMetrics, attachBotObservability } from '@tgwrapper/observability';

const metrics = new InMemoryMetrics();
const logger = new EcsJsonLogger({ serviceName: 'my-bot' }, { write: (line) => console.log(line) });

const detach = attachBotObservability(bot, {
  metrics,
  logger,
  serviceName: 'my-bot'
});

// later: detach();
```

## 7) Release quality gates

```bash
pnpm test
pnpm typecheck:compat
pnpm verify:release
```

## 8) Next reads

- `docs/MIGRATION_FROM_NODE_TELEGRAM_BOT_API.md`
- `docs/PRODUCTION_CHECKLIST.md`
- `docs/OBSERVABILITY_CONTRACT.md`
