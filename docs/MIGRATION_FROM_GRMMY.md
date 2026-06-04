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

---

## 🌱 When you've outgrown your first grammY stack

grammY is excellent for getting a bot running fast — its plugin ecosystem and `ctx` convenience make prototyping easy. The cracks appear when you scale: two instances writing to the same session key silently overwrite each other, you can't trace a user's update through your logs, and adding OpenTelemetry means building custom middleware from scratch. If you're hitting any of these, TGWrapper is the next step — not a rewrite, but a structured upgrade path that keeps your handler logic familiar while fixing the infrastructure layer underneath.

---

## 🔀 Code side-by-side — Per-user session with step tracking

### grammY (session plugin)

```typescript
import { Bot, session } from "grammy";
import { RedisAdapter } from "@grammyjs/storage-redis";

interface SessionData {
  step: "idle" | "awaiting_name" | "awaiting_age";
  name: string;
}

const bot = new Bot<any>(process.env.BOT_TOKEN!);
bot.use(session({
  initial: (): SessionData => ({ step: "idle", name: "" }),
  storage: new RedisAdapter({ client: redisInstance })
}));

bot.command("survey", async (ctx) => {
  ctx.session.step = "awaiting_name";       // No CAS — last write wins
  await ctx.reply("What is your name?");
});

bot.on("message:text", async (ctx) => {
  if (ctx.session.step === "awaiting_name") {
    ctx.session.name = ctx.message.text;
    ctx.session.step = "awaiting_age";
    await ctx.reply(`Thanks ${ctx.session.name}! How old are you?`);
  } else if (ctx.session.step === "awaiting_age") {
    await ctx.reply(`Got it: ${ctx.session.name}, age ${ctx.message.text}`);
    ctx.session.step = "idle";
    ctx.session.name = "";
  }
});

bot.start();
```

### TGWrapper (Redis session with CAS)

```typescript
import { createBotClient } from "@jilimb0/tgwrapper";
import { RedisSessionAdapter } from "@jilimb0/tgwrapper-adapter-redis";

interface SessionData {
  version: number;
  step: "idle" | "awaiting_name" | "awaiting_age";
  name: string;
}

const sessionAdapter = new RedisSessionAdapter({
  redisUrl: process.env.REDIS_URL!,
  tenantId: "prod", botId: "survey-bot", ttlSeconds: 86400
});

const bot = createBotClient({
  token: process.env.BOT_TOKEN!, mode: "polling",
  session: {
    store: sessionAdapter,
    initialState: (): SessionData => ({ version: 1, step: "idle", name: "" })
  }
});

bot.on("message", async (message) => {
  if (!("text" in message) || typeof message.text !== "string") return;
  const chatId = message.chat.id;

  if (message.text === "/survey") {
    await bot.updateSession(chatId, (s) => { s.step = "awaiting_name"; });
    await bot.sendMessage(chatId, "What is your name?");
    return;
  }

  const session = await bot.getSession(chatId);

  if (session.step === "awaiting_name") {
    await bot.updateSession(chatId, (s) => {
      s.name = message.text!;
      s.step = "awaiting_age";
    });
    await bot.sendMessage(chatId, `Thanks ${message.text}! How old are you?`);
  } else if (session.step === "awaiting_age") {
    await bot.sendMessage(chatId, `Got it: ${session.name}, age ${message.text}`);
    await bot.updateSession(chatId, (s) => { s.step = "idle"; s.name = ""; });
  }
});

await bot.start();
```

**Key difference:** grammY's `ctx.session` reads/writes are not atomic — if the same user sends two messages within milliseconds (e.g. double-tap), the second write can overwrite the first. TGWrapper's `updateSession` uses CAS (compare-and-swap) to detect and reject stale writes.

---

## 📋 grammY concepts → TGWrapper equivalents

| grammY concept | TGWrapper equivalent | Notes |
| :--- | :--- | :--- |
| `new Bot(token)` | `createBotClient({ token, mode })` | Mode is explicit: `'polling'` or `'webhook'` |
| `bot.command("x", fn)` | Guard inside `bot.on('message', ...)` | `if (message.text === '/x') { ... }` |
| `bot.on("message:text", fn)` | `bot.on('message', fn)` + type guard | `if (!('text' in message)) return;` |
| `bot.on("callback_query:data", fn)` | `bot.on('callback_query', fn)` | Access `callback.data` directly |
| `ctx.reply(text)` | `bot.sendMessage(chatId, text)` | Explicit chat ID — no magic context |
| `ctx.session.x = y` | `bot.updateSession(chatId, s => s.x = y)` | Atomic CAS write to Redis |
| `ctx.session` (read) | `await bot.getSession(chatId)` | Returns typed snapshot |
| `session({ storage: new RedisAdapter() })` | `session: { store: new RedisSessionAdapter() }` | Passed in `createBotClient` config |
| `bot.use(middleware)` | Compose inside handler | No middleware chain — plain functions |
| `bot.api.sendMessage(...)` | `bot.sendMessage(...)` | Direct typed method on client |
| `bot.start()` | `await bot.start()` | Must be awaited |
| `Composer` / `bot.filter()` | Plain `if` / helper functions | No built-in composer |
| Community plugins (menus, conversations) | Build with raw Telegram API payloads | Trade plugin convenience for full control |
```

