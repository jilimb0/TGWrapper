# Migration from Telegraf

This guide maps common Telegraf features to their TGWrapper equivalents, providing code translation recipes.

---

## 🧭 Architectural Mapping

| Feature Category | Telegraf Pattern | TGWrapper Equivalent |
| :--- | :--- | :--- |
| **Routing** | `bot.command('start', fn)` | `bot.on('message', ...)` |
| **Launch** | `bot.launch()` | `await bot.start()` |
| **Middlewares** | `bot.use(fn)` | Global handler wrappers |
| **Webhook setup** | `bot.webhookCallback('/secret')` | Native edge request handling configs |

---

## 🛠️ Code Translation Recipes

### 1. Handler & Command Setup

**Telegraf Code:**
```typescript
import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.BOT_TOKEN!);
bot.command('start', (ctx) => ctx.reply('Started!'));
bot.on('text', (ctx) => {
  ctx.reply(`Echo: ${ctx.message.text}`);
});
bot.launch();
```

**TGWrapper Translation:**
```typescript
import { createBotClient } from '@jilimb0/tgwrapper';

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'polling' });
bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') return;
  const chatId = message.chat.id;

  if (message.text === '/start') {
    await bot.sendMessage(chatId, 'Started!');
    return;
  }

  await bot.sendMessage(chatId, `Echo: ${message.text}`);
});
await bot.start();
```

---

### 2. Webhook Handling Translation

**Telegraf Webhook Setup:**
```typescript
import { Telegraf } from 'telegraf';
import express from 'express';

const bot = new Telegraf(process.env.BOT_TOKEN!);
const app = express();

app.use(bot.webhookCallback('/secret-path'));
bot.telegram.setWebhook('https://mybot.com/secret-path');
app.listen(3000);
```

**TGWrapper Webhook Translation:**
```typescript
import { createBotClient } from '@jilimb0/tgwrapper';
import { createServer } from 'http';

const bot = createBotClient({
  token: process.env.BOT_TOKEN!,
  mode: 'webhook'
});

// Start native HTTP webhooks ingestion server
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

