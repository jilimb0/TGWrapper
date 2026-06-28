# 5-Minute Quick Start

Build your first Telegram bot with TGWrapper in under 5 minutes. No Redis. No configuration. Just one file.

## Prerequisites

- Node.js >= 24
- A Telegram Bot Token from [@BotFather](https://t.me/BotFather)

## Step 1: Create a new project

```bash
mkdir my-first-bot && cd my-first-bot
npm init -y
npm install @tgwrapper/core
```

## Step 2: Create your bot

Create `bot.mjs`:

```typescript
import { createBotClient, PollingSource } from '@tgwrapper/core';

const bot = createBotClient({
  token: process.env.BOT_TOKEN!,
  session: { type: 'memory' },
});

bot.on('message', async (ctx) => {
  await ctx.reply(`You said: ${ctx.text}`);
});

const poller = new PollingSource(bot, { token: process.env.BOT_TOKEN! });
poller.start();

console.log('Bot is running...');
```

## Step 3: Run it

```bash
export BOT_TOKEN=your_bot_token_here
node bot.mjs
```

Send `/start` or any message to your bot on Telegram. It will echo it back.

## What's happening?

- `createBotClient` sets up the bot with in-memory sessions (no Redis required)
- `PollingSource` starts long-polling the Telegram API for updates
- The `on('message')` handler responds to every text message

## Next Steps

- [Add Redis for persistent sessions](./REDIS_RUNTIME_GUIDE.md)
- [Deploy to Cloudflare Workers](./CLOUDFLARE_WORKERS_GUIDE.md)
- [Add rate limiting](./RATE_LIMITING_GUIDE.md)
- [Enable observability](./OBSERVABILITY_GUIDE.md)
