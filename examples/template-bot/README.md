# Template Bot

> **Requirements:** Node.js `>=22.13`, `pnpm`, `tsx`
> **Use case:** minimal dual-mode polling and webhook starter with a basic FSM flow.

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

## What You Still Need to Implement

- Your production command and callback routing strategy.
- The session key model and tenant/user identity mapping.
- Secrets management for `BOT_TOKEN` and webhook credentials.
- Deployment configuration for the runtime environment you choose.

## How This Maps to Production

- Use `src/polling.ts` for local development and testing, not for high-scale webhook-driven production.
- Use `src/server.ts` as the basis for a Node HTTP webhook deployment when your infrastructure supports it.
- Externalize the bot token and webhook secret into your secret manager.
- Add observability and health check endpoints for your runtime platform.
