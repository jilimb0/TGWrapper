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
import { createBotClient } from '@tgwrapper/core';

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
import { createBotClient } from '@tgwrapper/core';
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

---

## 🚶 Step-by-step migration (minimal downtime)

1. **Install TGWrapper alongside Telegraf** — both can coexist in `package.json`.
   ```bash
   pnpm add @tgwrapper/core @tgwrapper/adapter-redis
   ```

2. **Port one handler at a time** — start with `/start` or your simplest command. Verify it against the Telegram test chat before touching the next handler.

3. **Replace session layer** — swap Telegraf's `session()` middleware for `RedisSessionAdapter`. Map your existing `ctx.session` keys to `initialState` fields.
   ```typescript
   // Before (Telegraf)
   bot.use(session());
   // After (TGWrapper)
   const bot = createBotClient({
     token: process.env.BOT_TOKEN!, mode: 'polling',
     session: { store: sessionAdapter, initialState: () => ({ version: 1 }) }
   });
   ```

4. **Run both bots on separate tokens during QA** — create a staging bot via BotFather and point TGWrapper at it. Run integration tests, then swap tokens.

5. **Remove Telegraf** — once every handler passes on the staging token, uninstall Telegraf and deploy.
   ```bash
   pnpm remove telegraf
   ```

---

## 🔀 Code side-by-side — Stateful step counter

### Telegraf (scene-based)

```typescript
import { Telegraf, Scenes, session } from 'telegraf';

const stepScene = new Scenes.BaseScene<Scenes.SceneContext>('step');
stepScene.enter((ctx) => ctx.reply('Step 1: Send your name'));
stepScene.on('text', async (ctx) => {
  const step = (ctx.scene.state as any).step ?? 1;
  if (step === 1) {
    (ctx.scene.state as any).name = ctx.message.text;
    (ctx.scene.state as any).step = 2;
    await ctx.reply('Step 2: Send your email');
  } else {
    await ctx.reply(`Done! Name: ${(ctx.scene.state as any).name}, Email: ${ctx.message.text}`);
    await ctx.scene.leave();
  }
});

const stage = new Scenes.Stage<Scenes.SceneContext>([stepScene]);
const bot = new Telegraf<Scenes.SceneContext>(process.env.BOT_TOKEN!);
bot.use(session());
bot.use(stage.middleware());
bot.command('register', (ctx) => ctx.scene.enter('step'));
bot.launch();
```

### TGWrapper (session-based)

```typescript
import { createBotClient } from '@tgwrapper/core';
import { RedisSessionAdapter } from '@tgwrapper/adapter-redis';

const sessionAdapter = new RedisSessionAdapter({
  redisUrl: process.env.REDIS_URL!,
  tenantId: 'prod', botId: 'register-bot', ttlSeconds: 86400
});

const bot = createBotClient({
  token: process.env.BOT_TOKEN!, mode: 'polling',
  session: {
    store: sessionAdapter,
    initialState: () => ({ version: 1, step: 'idle' as 'idle' | 'name' | 'email', name: '' })
  }
});

bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') return;
  const chatId = message.chat.id;

  if (message.text === '/register') {
    await bot.updateSession(chatId, (s) => { s.step = 'name'; });
    await bot.sendMessage(chatId, 'Step 1: Send your name');
    return;
  }

  const session = await bot.getSession(chatId);
  if (session.step === 'name') {
    await bot.updateSession(chatId, (s) => { s.name = message.text!; s.step = 'email'; });
    await bot.sendMessage(chatId, 'Step 2: Send your email');
  } else if (session.step === 'email') {
    await bot.sendMessage(chatId, `Done! Name: ${session.name}, Email: ${message.text}`);
    await bot.updateSession(chatId, (s) => { s.step = 'idle'; s.name = ''; });
  }
});

await bot.start();
```

**Key difference:** Telegraf scenes hold state in an in-memory scene context that vanishes on restart. TGWrapper persists every step transition to Redis with CAS protection — safe across multiple instances and process restarts.

---

## ⚠️ Common migration stumbling blocks

- **`ctx.reply()` doesn't exist** — TGWrapper uses explicit `bot.sendMessage(chatId, text)`. Extract `chatId` from `message.chat.id` at the top of every handler. This is deliberate: it keeps handlers pure functions that don't depend on a magic context object.

- **Middleware chain is gone** — Telegraf's `bot.use(fn)` registers ordered middleware. TGWrapper has no middleware chain; instead, compose logic inside your `bot.on('message', ...)` handler or write plain wrapper functions. Example:
  ```typescript
  // Reusable guard — replaces Telegraf middleware
  function requireText(msg: unknown): msg is { text: string; chat: { id: number } } {
    return typeof msg === 'object' && msg !== null && 'text' in msg;
  }

  bot.on('message', async (message) => {
    if (!requireText(message)) return;
    // ... handler logic
  });
  ```

- **`bot.launch()` → `await bot.start()`** — TGWrapper's `start()` is async and must be awaited. Forgetting `await` means the process exits before the polling loop begins. If you're in a CommonJS entrypoint, wrap in an async IIFE:
  ```typescript
  (async () => { await bot.start(); })();
  ```
