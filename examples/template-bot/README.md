# Template Bot

Minimal starter template for building Telegram bots with TGWrapper.

## Includes

- Polling mode entrypoint: `src/polling.ts`
- Webhook (Node HTTP) entrypoint: `src/server.ts`
- Basic FSM flow (`idle -> await_name -> idle`)
- Commands (`/start`, `/name`) and callback buttons

## Setup

1. Copy env template:

```bash
cp .env.example .env
```

2. Fill required variables:

- `BOT_TOKEN`
- `WEBHOOK_SECRET` (for webhook mode)
- `PORT` (optional, default `3000`)

## Run: polling mode

```bash
pnpm --dir examples/template-bot install
pnpm --dir examples/template-bot dev:polling
```

## Run: webhook mode (Node HTTP)

```bash
pnpm --dir examples/template-bot install
pnpm --dir examples/template-bot dev:webhook
```

Then send Telegram webhook requests to the server path used by your deployment setup.

## What to edit first

- Router handlers in `src/polling.ts` / `src/server.ts`
- Session shape (`Data`) and states (`State`)
- `resolveSessionKey` strategy if you need tenant/user scoping changes
