# From python-telegram-bot to TypeScript with TGWrapper

A practical migration guide for teams switching from `python-telegram-bot` (PTB) to TGWrapper.

---

## 1. Why teams make this move

- **Shared types across the stack** — your frontend, backend, and bot all speak TypeScript. No more maintaining Python type stubs alongside a TS monorepo.
- **Serverless & edge deployment** — TGWrapper runs on Cloudflare Workers and AWS Lambda with sub-50ms cold starts. Python's asyncio loop adds 200–400ms of startup overhead in the same environments.
- **Built-in observability** — structured logs, OpenTelemetry traces, and pull-based metrics ship with the framework. PTB gives you Python's `logging` module and nothing else.
- **Atomic session state** — PTB's `user_data` / `chat_data` dicts use last-write-wins. TGWrapper's Redis sessions use CAS (compare-and-swap) to prevent silent overwrites.

---

## 2. Concept mapping table

| python-telegram-bot | TGWrapper | Notes |
| :--- | :--- | :--- |
| `Application.builder().token(T).build()` | `createBotClient({ token: T, mode: 'polling' })` | Mode is explicit |
| `application.add_handler(CommandHandler(...))` | `bot.on('message', fn)` + command guard | Single event handler |
| `application.add_handler(MessageHandler(...))` | `bot.on('message', fn)` + type guard | `if ('text' in msg) { ... }` |
| `CallbackQueryHandler(fn)` | `bot.on('callback_query', fn)` | Direct event |
| `ConversationHandler(entry_points, states, fallbacks)` | Session state machine via `updateSession` | See stateful bot example below |
| `context.bot.send_message(chat_id, text)` | `bot.sendMessage(chatId, text)` | Typed method |
| `context.user_data["key"]` | `await bot.getSession(chatId)` | Returns typed object |
| `context.user_data["key"] = val` | `await bot.updateSession(chatId, s => s.key = val)` | Atomic CAS write |
| `application.run_polling()` | `await bot.start()` | Async, must be awaited |
| `application.run_webhook(...)` | `createBotClient({ mode: 'webhook' })` | Config flag, not a method |
| `JobQueue` (scheduled tasks) | External scheduler (cron, BullMQ) | Not built in — use Node ecosystem |
| Python `logging` module | `@jilimb0/tgwrapper-observability` | Structured JSON + OTel spans |

---

## 3. Side-by-side: echo bot

### python-telegram-bot

```python
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Hello!")

async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(f"Echo: {update.message.text}")

app = Application.builder().token("BOT_TOKEN").build()
app.add_handler(CommandHandler("start", start))
app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))
app.run_polling()
```

### TGWrapper (TypeScript)

```typescript
import { createBotClient } from '@jilimb0/tgwrapper';

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'polling' });

bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') return;
  const chatId = message.chat.id;

  if (message.text === '/start') {
    await bot.sendMessage(chatId, 'Hello!');
    return;
  }

  await bot.sendMessage(chatId, `Echo: ${message.text}`);
});

await bot.start();
```

---

## 4. Side-by-side: stateful bot

### python-telegram-bot (`ConversationHandler`)

```python
from telegram import Update
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    ConversationHandler, filters, ContextTypes
)

NAME, EMAIL = range(2)

async def register(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Step 1: What is your name?")
    return NAME

async def name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["name"] = update.message.text
    await update.message.reply_text("Step 2: What is your email?")
    return EMAIL

async def email(update: Update, context: ContextTypes.DEFAULT_TYPE):
    n = context.user_data["name"]
    await update.message.reply_text(f"Done! Name: {n}, Email: {update.message.text}")
    return ConversationHandler.END

app = Application.builder().token("BOT_TOKEN").build()
app.add_handler(ConversationHandler(
    entry_points=[CommandHandler("register", register)],
    states={
        NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, name)],
        EMAIL: [MessageHandler(filters.TEXT & ~filters.COMMAND, email)],
    },
    fallbacks=[]
))
app.run_polling()
```

### TGWrapper (Redis session)

```typescript
import { createBotClient } from '@jilimb0/tgwrapper';
import { RedisSessionAdapter } from '@jilimb0/tgwrapper-adapter-redis';

interface Session {
  version: number;
  step: 'idle' | 'name' | 'email';
  name: string;
}

const sessionAdapter = new RedisSessionAdapter({
  redisUrl: process.env.REDIS_URL!,
  tenantId: 'prod', botId: 'register-bot', ttlSeconds: 86400
});

const bot = createBotClient({
  token: process.env.BOT_TOKEN!, mode: 'polling',
  session: {
    store: sessionAdapter,
    initialState: (): Session => ({ version: 1, step: 'idle', name: '' })
  }
});

bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') return;
  const chatId = message.chat.id;

  if (message.text === '/register') {
    await bot.updateSession(chatId, (s) => { s.step = 'name'; });
    await bot.sendMessage(chatId, 'Step 1: What is your name?');
    return;
  }

  const session = await bot.getSession(chatId);

  if (session.step === 'name') {
    await bot.updateSession(chatId, (s) => { s.name = message.text!; s.step = 'email'; });
    await bot.sendMessage(chatId, 'Step 2: What is your email?');
  } else if (session.step === 'email') {
    await bot.sendMessage(chatId, `Done! Name: ${session.name}, Email: ${message.text}`);
    await bot.updateSession(chatId, (s) => { s.step = 'idle'; s.name = ''; });
  }
});

await bot.start();
```

**Key difference:** PTB's `ConversationHandler` stores state in-memory — it's lost on restart and can't span multiple processes. TGWrapper persists every state transition to Redis with CAS protection, so the same user can be served by any instance in your fleet.

---

## 5. Setting up TypeScript

### Install

```bash
pnpm add @jilimb0/tgwrapper
pnpm add -D typescript @types/node tsx
```

### `tsconfig.json` essentials

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

### Run in development

```bash
BOT_TOKEN="your_token" node --import tsx src/bot.ts
```

### Build for production

```bash
npx tsc
node dist/bot.js
```

---

## 6. What you gain / what you give up

| ✅ You gain | ❌ You give up |
| :--- | :--- |
| Compile-time type safety across bot + API | Python's rapid prototyping speed |
| Sub-50ms serverless cold starts | Python-only ML/NLP libraries (call via API instead) |
| CAS-protected distributed sessions | PTB's built-in `ConversationHandler` abstraction |
| Structured OpenTelemetry traces out of the box | Python `logging` familiarity |
| Same language as your frontend/API layer | `JobQueue` for scheduled tasks (use cron/BullMQ) |
| Node.js + Cloudflare Workers + Lambda portability | Python ecosystem breadth |

---

## 7. Next steps

- [Bot Development Guide](./BOT_DEVELOPMENT_GUIDE.md) — full API walkthrough
- [Redis Runtime Guide](./REDIS_RUNTIME.md) — session topologies, failure modes
- [Telemetry Reference](./TELEMETRY_REFERENCE.md) — structured logs, metrics, traces
- [Production Checklist](./PRODUCTION_CHECKLIST.md) — pre-launch hardening
- [Comparison Matrix](./COMPARISON.md) — TGWrapper vs grammY vs Telegraf
