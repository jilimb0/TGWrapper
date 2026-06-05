# TGWrapper Migration Starter

Template package for migrating a stateful Telegram bot from Telegraf-style handlers to TGWrapper with Redis-backed sessions, Compare-and-Swap writes, and structured logs.

Use this starter when you want a side-by-side migration reference:

- `src/bot-before.ts` shows the Telegraf baseline.
- `src/bot-after.ts` shows the TGWrapper implementation.
- `dist/` contains built JavaScript entrypoints after `pnpm build`.

## Quick Start

```bash
pnpm create @tgwrapper my-migration-bot --template migration
cd my-migration-bot
cp .env.example .env
pnpm install
```

Edit `.env`, then run one of the entrypoints:

```bash
export BOT_TOKEN="your_botfather_token"
export REDIS_URL="redis://localhost:6379"

pnpm tsx src/bot-before.ts
pnpm tsx src/bot-after.ts
```

Expected TGWrapper startup output:

```json
{"event":"startup","serviceName":"registration-service","mode":"polling","redisUrl":"redis://localhost:6379"}
```

## Environment Variables

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `BOT_TOKEN` | yes | none | Telegram bot token from BotFather. |
| `REDIS_URL` | no | `redis://localhost:6379` | Redis connection used by the TGWrapper session adapter. |

## What Gets Installed

The npm package is a project template, not a library API. It ships:

- `src/bot-before.ts`
- `src/bot-after.ts`
- compiled `dist/` files
- `README.md`
- `CHANGELOG.md`
- `tsconfig.json`
- `.env.example`

Copy the files into your own application and then change package name, commands, Redis topology, tenant IDs, bot IDs, telemetry destinations, and handlers.

## Manual Copy Fallback

Power users can install this package directly and copy the template files:

```bash
pnpm add -D @tgwrapper/starter-migration
mkdir my-migration-bot
cp -R node_modules/@tgwrapper/starter-migration/{src,tsconfig.json,.env.example} my-migration-bot/
```

## Migration Checklist

- Install `@tgwrapper/core`, `@tgwrapper/adapter-redis`, and `@tgwrapper/observability`.
- Define a strict session state interface with `version: number`.
- Replace implicit `ctx.session` mutations with explicit `compareAndSet` writes.
- Replace `ctx.reply(...)` with `bot.sendMessage(...)`.
- Attach observability during startup.
- Handle `SIGINT` and `SIGTERM` to stop polling and close Redis.

## Production Webhook Path

This starter uses polling because it is easiest for local migration work. For production:

- switch the TGWrapper client to webhook mode;
- expose the webhook handler from your HTTP platform;
- keep Redis shared across all running instances;
- route JSON logs to your production log pipeline;
- keep `BOT_TOKEN` and Redis credentials in your secret manager.
