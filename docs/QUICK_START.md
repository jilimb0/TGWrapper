# Quick Start — Your First TGWrapper Bot

Get a working Telegram bot running in under 5 minutes. No Redis. No observability. No configuration files. Just a bot that responds to messages.

---

## 1. Install

```bash
mkdir my-bot && cd my-bot
pnpm init
pnpm add @tgwrapper/core
pnpm add -D tsx
```

## 2. Get a bot token

Open Telegram, message [@BotFather](https://t.me/BotFather), run `/newbot`, and copy the token.

## 3. Write the bot

Create `bot.ts`:

```typescript
import { createBotClient } from '@tgwrapper/core';

const bot = createBotClient({
  token: 'YOUR_BOT_TOKEN',  // paste your token here
  mode: 'polling',
});

bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') return;
  const chatId = message.chat.id;

  if (message.text === '/start') {
    await bot.sendMessage(chatId, '👋 Hello! Send me any message and I will echo it back.');
    return;
  }

  await bot.sendMessage(chatId, `You said: ${message.text}`);
});

bot.on('error', (err) => console.error('Bot error:', err));

console.log('Bot is running...');
await bot.start();
```

## 4. Run it

```bash
node --import tsx bot.ts
```

## 5. Test it

Open Telegram, find your bot, and send `/start`. You should see:

```
👋 Hello! Send me any message and I will echo it back.
```

Send any text message. The bot echoes it back.

**That's it. Your bot is running.**

---

## What just happened

- `createBotClient()` — creates a typed Telegram bot client
- `mode: 'polling'` — the bot pulls updates from Telegram (good for development, no server needed)
- `bot.on('message', ...)` — handles every incoming message
- `bot.sendMessage(chatId, text)` — sends a reply
- `await bot.start()` — starts the polling loop

No middleware chain to learn. No context object with hidden state. Just typed messages in, typed API calls out.

---

## What's next?

You've got a working bot. Where you go next depends on what you're building:

### 🟢 Keep it simple

Your bot handles a few commands, runs on one server, and doesn't need persistent state? You're done with the hard part. Browse the [examples](../examples/) for patterns like:
- Multi-command routing — see [polling-starter](../examples/polling-starter)
- Callback query buttons — same handler pattern with `bot.on('callback_query', ...)`

### 🔵 Build for production

Your bot needs to survive restarts, run on multiple instances, or handle real traffic? The production path adds three things incrementally:

| Step | What you add | Why | Time |
| :--- | :--- | :--- | :--- |
| **1. Redis sessions** | `@tgwrapper/adapter-redis` | State survives restarts, shared across instances | 10 min |
| **2. Observability** | `@tgwrapper/observability` | Trace IDs in every log, structured events, metrics | 5 min |
| **3. Webhook + deploy** | `mode: 'webhook'` | Serverless-ready, edge-native, scales horizontally | 15 min |

See [Grow with TGWrapper](./GROW_WITH_TGWRAPPER.md) for the full path from first bot to production deployment.

---

## Learn more

- [Tutorial ladder](./TUTORIALS.md) — step-by-step from echo bot to AI-native
- [Grow with TGWrapper](./GROW_WITH_TGWRAPPER.md) — staged adoption path
- [Why TGWrapper?](./WHY_TGWRAPPER.md) — what makes it different and when it matters
- [Example projects](../examples/) — runnable reference implementations
