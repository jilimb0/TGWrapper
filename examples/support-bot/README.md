# TGWrapper Support Bot Starter

Support queue routing template for TGWrapper. It demonstrates stateful support intake, agent assignment, Redis session storage, graceful shutdown, and structured JSON logs.

Use this starter when you want a small app blueprint for:

- `/support` intake flows;
- assigning a user to an available support agent;
- forwarding user messages after assignment;
- evolving the in-memory agent list into a database or Redis-backed directory.

## Quick Start

```bash
pnpm create @tgwrapper my-support-bot --template support
cd my-support-bot
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
{"event":"startup","serviceName":"support-routing-service","mode":"polling","redisUrl":"redis://localhost:6379","availableAgents":2}
```

Send `/support`, then a follow-up message, to exercise the queue routing path.

## Environment Variables

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `BOT_TOKEN` | yes | none | Telegram bot token from BotFather. |
| `REDIS_URL` | no | `redis://localhost:6379` | Redis connection used by the session adapter. |

## What Gets Installed

The npm package is a project template, not a runtime library. It ships:

- `src/bot.ts`
- compiled `dist/` files
- `README.md`
- `CHANGELOG.md`
- `tsconfig.json`
- `.env.example`

Copy the template into your own repository, rename the package, replace `AVAILABLE_AGENTS`, and connect routing decisions to your production support directory.

## Manual Copy Fallback

Power users can install this package directly and copy the template files:

```bash
pnpm add -D @tgwrapper/starter-support-bot
mkdir my-support-bot
cp -R node_modules/@tgwrapper/starter-support-bot/{src,tsconfig.json,.env.example} my-support-bot/
```

## Production Webhook Path

This starter uses polling for local development. For production webhook deployment:

- change the TGWrapper client mode to webhook;
- mount the webhook handler in your HTTP runtime;
- move the support agent directory out of source code;
- keep Redis shared across all instances;
- send structured logs to your production log pipeline.
