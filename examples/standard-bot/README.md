# TGWrapper Standard Bot Starter

> **Requirements:** Node.js `>=22.13`, `pnpm`, `tsx`, Redis `>=6.2`
>
> **Use case:** production-ready polling bot with Redis sessions, rate limiting, and telemetry.
>
> **Included:** bot runtime, Redis session and limiter wiring, observability integration, and graceful shutdown.

Production-oriented Telegram bot template for TGWrapper with Redis sessions, distributed rate limiting, graceful shutdown, and structured JSON logs.

Use this starter when you need a baseline app with:

- polling-mode development startup;
- Redis-backed session state with Compare-and-Swap writes;
- Redis-backed rate limiting;
- observability wiring through `@tgwrapper/observability`.

## Quick Start

```bash
pnpm create @tgwrapper my-standard-bot --template standard
cd my-standard-bot
cp .env.example .env
pnpm install
```

Edit `.env`, then start the bot:

```bash
export BOT_TOKEN="your_botfather_token"
export REDIS_URL="redis://localhost:6379"

pnpm tsx src/bot.ts
```

Expected startup output:

```json
{
  "event": "startup",
  "serviceName": "standard-bot-service",
  "mode": "polling",
  "redisUrl": "redis://localhost:6379",
  "rateLimit": { "windowMs": 60000, "limit": 15 }
}
```

Send `/start` or `/click` to the bot in Telegram to verify session writes and rate limiting.

## Environment Variables

| Name        | Required | Default                  | Description                                           |
| ----------- | -------- | ------------------------ | ----------------------------------------------------- |
| `BOT_TOKEN` | yes      | none                     | Telegram bot token from BotFather.                    |
| `REDIS_URL` | no       | `redis://localhost:6379` | Redis connection used for sessions and rate limiting. |

## What Gets Installed

The npm package is a project template, not a runtime library. It ships:

- `src/bot.ts`
- compiled `dist/` files
- `README.md`
- `CHANGELOG.md`
- `tsconfig.json`
- `.env.example`

Copy the template into your own repository, rename the package, then replace the sample commands, tenant IDs, bot IDs, rate limits, and telemetry sink with your production values.

## What You Still Need to Implement

- Your production Redis topology and credentials management.
- The business routing, command handling, and session state model.
- Secret management for `BOT_TOKEN` and `REDIS_URL`.
- Production observability sinks and log pipeline configuration.

## Manual Copy Fallback

Power users can install this package directly and copy the template files:

```bash
pnpm add -D @tgwrapper/starter-standard-bot
mkdir my-standard-bot
cp -R node_modules/@tgwrapper/starter-standard-bot/{src,tsconfig.json,.env.example} my-standard-bot/
```

## How This Maps to Production

This starter uses polling for local development. For production webhook deployment:

- change the TGWrapper client mode to webhook;
- mount the webhook handler in your HTTP runtime;
- store `BOT_TOKEN` and Redis credentials in your secret manager;
- keep Redis reachable from every instance;
- send JSON logs to your log pipeline, such as Loki, Datadog, or CloudWatch.
