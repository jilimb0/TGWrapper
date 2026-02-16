# Bot Development Guide

This guide covers end-to-end bot setup with TGWrapper: local development, polling, webhook, and production-readiness checks.

## Prerequisites

- Node.js 20+
- pnpm 10+
- Telegram bot token from BotFather
- Optional for webhook local testing: ngrok (or equivalent tunnel)

## 1) Create a New Bot Project

From repository root:

```bash
cp -R examples/template-bot ../my-bot
cd ../my-bot
cp .env.example .env
pnpm install
```

Fill `.env`:

```env
BOT_TOKEN=123456:YOUR_REAL_TOKEN
WEBHOOK_SECRET=your-random-long-secret
PORT=3000
```

## 2) Run in Polling Mode (recommended for first iteration)

Disable webhook first (if already configured):

```bash
export BOT_TOKEN="123456:YOUR_REAL_TOKEN"
curl -sS -X POST "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook" \
  -d "drop_pending_updates=true"
```

Start polling bot:

```bash
pnpm dev:polling
```

Test in Telegram:

- `/start`
- `/name`
- send text

## 3) Run in Webhook Mode

Start local server:

```bash
pnpm dev:webhook
```

Expose local port publicly (example with ngrok):

```bash
ngrok http 3000
```

Assume public URL is `https://xxxx.ngrok-free.app`:

```bash
export BOT_TOKEN="123456:YOUR_REAL_TOKEN"
export WEBHOOK_SECRET="your-random-long-secret"
export PUBLIC_URL="https://xxxx.ngrok-free.app"

curl -sS -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -d "url=${PUBLIC_URL}" \
  -d "secret_token=${WEBHOOK_SECRET}" \
  -d "drop_pending_updates=true"
```

Verify webhook:

```bash
curl -sS "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"
```

## 4) Where to Implement Bot Logic

Primary files in template:

- `src/polling.ts`
- `src/server.ts`

What to customize:

- command handlers: `router.command(...)`
- callback handlers: `router.callback(...)`
- FSM handlers: `router.state(...)`
- state/data models: `type State`, `interface Data`
- session key strategy: `resolveSessionKey`

## 5) Core Runtime Pattern

Minimal flow in TGWrapper:

1. create `ApiClient`
2. create session storage (`MemorySessionStorage` or Redis)
3. create `SessionManager`
4. define `TreeRouter` handlers
5. create `BotKernel`
6. run with `BotRuntime + PollingSource` or adapter + `WebhookHandler`

## 6) Local Quality Gates (before deployment)

From framework repository root:

```bash
pnpm verify:release
```

For release-grade confidence:

```bash
pnpm verify:1.0
```

## 7) Production Checklist (minimum)

- set `BOT_TOKEN` via secret manager
- set strong `WEBHOOK_SECRET`
- add metrics/logging pipeline
- run Redis-backed sessions for multi-instance bots
- monitor Telegram latency, retries, and queue overflow
- keep release process CI-only

See:

- `docs/PRODUCTION_CHECKLIST.md`
- `docs/OBSERVABILITY_CONTRACT.md`
- `docs/OPERATIONS_RUNBOOK.md`

## 8) Useful Telegram API Commands

Validate token:

```bash
curl -sS "https://api.telegram.org/bot${BOT_TOKEN}/getMe"
```

Disable webhook and return to polling:

```bash
curl -sS -X POST "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook" \
  -d "drop_pending_updates=true"
```
