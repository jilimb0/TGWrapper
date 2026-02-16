# Template Bot

Minimal starter template for building Telegram bots with TGWrapper.

## Includes

- Polling mode entrypoint: `src/polling.ts`
- Webhook (Node HTTP) entrypoint: `src/server.ts`
- Basic FSM flow (`idle -> await_name -> idle`)
- Commands (`/start`, `/name`) and callback buttons

## Setup

```bash
cp .env.example .env
```

Set required variables:

- `BOT_TOKEN`
- `WEBHOOK_SECRET` (webhook mode)
- `PORT` (optional, default `3000`)

Install dependencies:

```bash
pnpm install
```

## Run: Polling

```bash
pnpm dev:polling
```

## Run: Webhook (Node HTTP)

```bash
pnpm dev:webhook
```

## What to edit first

- Router handlers in `src/polling.ts` / `src/server.ts`
- Session shape (`Data`) and states (`State`)
- `resolveSessionKey` strategy for your user/tenant model
