# Migration from grammY

This guide maps common grammY features to their TGWrapper equivalents, providing drop-in code translations.

---

## 🧭 Architectural Mapping

| Feature Category | grammY Pattern | TGWrapper Equivalent |
| :--- | :--- | :--- |
| **Command Routing** | `bot.command("start", fn)` | `bot.on('message', ...)` with command guards |
| **Sessions** | `ctx.session.x = y` | `await bot.updateSession(chatId, (s) => s.x = y)` |
| **State Adapter** | `new RedisAdapter({ client })` | `new RedisSessionAdapter({ redis })` (with CAS protection) |
| **Telemetry** | Custom middleware wrappers | Attach `@jilimb0/tgwrapper-observability` directly |

---

## 🛠️ Code Translation Recipes

### 1. Handler Routing Translation

**grammY Code:**
```typescript
import { Bot } from "grammy";

const bot = new Bot(process.env.BOT_TOKEN!);
bot.command("start", async (ctx) => {
  await ctx.reply("Hello!");
});
bot.on("message:text", async (ctx) => {
  if (ctx.message.text.includes("alert")) {
    await ctx.reply("Alert noticed.");
  }
});
bot.start();
```

**TGWrapper Translation:**
```typescript
import { createBotClient } from "@jilimb0/tgwrapper";

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'polling' });
bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') return;
  const chatId = message.chat.id;

  // Command handling
  if (message.text === '/start') {
    await bot.sendMessage(chatId, "Hello!");
    return;
  }

  // Text filters
  if (message.text.includes("alert")) {
    await bot.sendMessage(chatId, "Alert noticed.");
  }
});
await bot.start();
```

---

### 2. Session Persistent Translation

**grammY Session:**
```typescript
import { Bot, session } from "grammy";
import { RedisAdapter } from "@grammyjs/storage-redis";

const bot = new Bot(process.env.BOT_TOKEN!);
bot.use(session({
  initial: () => ({ clicks: 0 }),
  storage: new RedisAdapter({ client: redisInstance })
}));
bot.on("message", (ctx) => {
  ctx.session.clicks++; // Race-prone write lock overwrite
});
```

**TGWrapper Session:**
```typescript
import { createBotClient } from "@jilimb0/tgwrapper";
import { RedisSessionAdapter } from "@jilimb0/tgwrapper-adapter-redis";

const sessionAdapter = new RedisSessionAdapter({
  redis: redisInstance,
  tenantId: 'prod',
  botId: 'clicks-bot'
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
  const chatId = message.chat.id;
  // Atomic CAS session update
  await bot.updateSession(chatId, (state) => {
    state.clicks = (state.clicks || 0) + 1;
  });
});
```

