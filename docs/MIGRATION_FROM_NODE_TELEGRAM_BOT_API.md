# Migration From node-telegram-bot-api

This migration guide focuses on replacing ad-hoc bot code with typed TGWrapper APIs.

## 1) Replace bot constructor

Before:

```ts
import TelegramBot from 'node-telegram-bot-api';
const bot = new TelegramBot(token, { polling: true });
```

After:

```ts
import { createBotClient } from '@tgwrapper/core';
const bot = createBotClient({ token, mode: 'polling' });
await bot.start();
```

## 2) Replace event handlers

Before:

```ts
bot.on('message', async (msg) => { ... });
bot.on('callback_query', async (q) => { ... });
```

After:

```ts
bot.on('message', async (message) => { ... });
bot.on('callback_query', async (callback) => { ... });
bot.on('error', (error) => { ... });
```

## 3) Replace direct API calls

Before:

```ts
await bot.sendMessage(chatId, 'text');
await bot.editMessageText('new', { chat_id, message_id });
```

After:

```ts
await bot.sendMessage(chatId, 'text');
await bot.editMessageText({ chat_id, message_id, text: 'new' });
```

## 4) Replace custom file-link logic

Before:

```ts
const f = await bot.getFile(fileId);
const link = `https://api.telegram.org/file/bot${token}/${f.file_path}`;
```

After:

```ts
const link = await bot.getFileLink(fileId);
```

## 5) CJS projects

TGWrapper packages are dual-mode and support both import styles.

CJS:

```js
const { createBotClient } = require('@tgwrapper/core');
```

ESM:

```ts
import { createBotClient } from '@tgwrapper/core';
```

## 6) Recommended migration order

1. Move transport lifecycle to `createBotClient` (`start/stop`).
2. Move handlers to `bot.on(...)`.
3. Replace raw API calls with typed methods.
4. Add Redis cache/rate limiting.
5. Attach observability and alerting.
