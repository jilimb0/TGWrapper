# Serverless Webhook Starter

> **Stability:** Early Production · **Runtime:** Node.js ≥ 18, Cloudflare Workers, AWS Lambda · **Mode:** Webhook (passive)

A reference template showing how to receive Telegram updates via webhooks in serverless, edge, and event-driven environments. The bot has no background loop — it wakes up only when Telegram POSTs an update.

---

## ✨ What This Demonstrates

| Capability | Implementation |
| :--- | :--- |
| **Zero background process** | No polling loop — runs purely on Telegram-triggered HTTP invocations |
| **Platform-portable handler** | One `bot.ingest(update)` call works on Cloudflare Workers, AWS Lambda, and Node.js HTTP server |
| **Cold-start optimized** | Bot client initialized at module scope — reused across warm invocations |
| **Secret token validation** | `X-Telegram-Bot-Api-Secret-Token` header verification shown in production notes |
| **Local tunnel dev workflow** | `ngrok` / `localtunnel` setup for iterating without deploying |

> **When to add state:** Combine this with the Redis adapter (see [`multi-instance-redis-starter`](../multi-instance-redis-starter)) to get distributed sessions + rate limiting in serverless mode.

---

## 🌐 Platform Deployment Matrix

| Platform | Adapter | Notes |
| :--- | :--- | :--- |
| **Node.js HTTP** | `node:http` / Express | Best for VPS or containerized deployments |
| **Cloudflare Workers** | `fetch` handler export | Edge-native; see [`examples/cloudflare-worker`](../cloudflare-worker) |
| **AWS Lambda + API GW** | `handler` export | See [`examples/aws-lambda`](../aws-lambda); initialize bot outside handler |
| **Vercel / Netlify** | Standard serverless function | Use the Node.js HTTP adapter pattern |

---

## 🏗️ Architecture

```
Telegram Bot API
      │
      │  POST /webhook  (JSON update payload)
      ▼
 Your HTTP handler  (Cloudflare Worker / Lambda / Node HTTP)
      │
      └─► bot.ingest(update)
                │
                ├─► TGWrapper Router & Handlers
                │
                └─► bot.sendMessage(...)
```

Unlike polling, no process is running between requests. Each serverless invocation is stateless and short-lived.

---

## 🛠️ Getting Started

### 1. Copy and fill environment variables

```bash
cp .env.example .env
```

`.env.example`:
```env
# Required — obtain from @BotFather on Telegram
BOT_TOKEN="your_telegram_bot_token"
# Recommended — use a long random string to verify Telegram's requests
WEBHOOK_SECRET="your_secret_token_to_verify_telegram"
# Local dev server port
PORT="3000"
```

### 2. Install and run locally

```bash
pnpm install
pnpm start
```

For local testing, expose your dev server with a tunnel:

```bash
# Using ngrok:
ngrok http 3000
# Using localtunnel:
npx localtunnel --port 3000
```

### 3. Register the webhook URL with Telegram

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://<your-tunnel-or-deployed-url>/webhook", "secret_token": "<WEBHOOK_SECRET>"}'
```

---

## 🚀 Deploying to Production

### Cloudflare Workers

```typescript
import { createBotClient } from '@jilimb0/tgwrapper';

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'webhook' });
await bot.start();

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    const update = await request.json();
    await bot.ingest(update);
    return new Response('OK', { status: 200 });
  }
};
```

### AWS Lambda (API Gateway)

```typescript
import { createBotClient } from '@jilimb0/tgwrapper';

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'webhook' });
await bot.start();

export const handler = async (event: { body: string }) => {
  const update = JSON.parse(event.body || '{}');
  await bot.ingest(update);
  return { statusCode: 200, body: 'OK' };
};
```

> **Note:** Initialize `bot` outside the handler (module scope) to reuse across warm Lambda invocations.

---

## 🔬 Smoke Test

Type-check (no live token required):

```bash
pnpm test
```

Functional integration check:
1. Start the local server: `pnpm start`
2. Start a tunnel and register the webhook URL (see step 3 above)
3. Send `/start` in Telegram — expect the bot to respond
4. Check console logs for `[ingest]` entries

---

## 🚀 Production Notes

| Concern | Recommendation |
|---|---|
| Webhook secret | Always set `WEBHOOK_SECRET` and validate the `X-Telegram-Bot-Api-Secret-Token` header in production |
| Multiple instances | Webhook mode is naturally horizontal — each serverless instance handles its own invocation |
| Cold starts | Keep handler initialization in module scope (outside `fetch`/`handler`) to benefit from runtime reuse |
| Timeout budget | Telegram expects a 200 response within ~60 s; ensure your handler logic is non-blocking |
| Idempotency | Telegram may retry updates on network failure; make handlers idempotent where state is mutated |

---

## ⚠️ Known Limitations

- **No background state.** Serverless functions are stateless by default. You must provide external session storage (e.g. Redis adapter) to persist user context across requests.
- **No in-process rate limiting.** The in-memory rate limiter from core does not work across serverless instances. Use the Redis adapter's distributed rate limiter.
- **Webhook registration is manual.** You must call `setWebhook` yourself after each deploy to a new URL.
- **Secret token validation is your responsibility.** TGWrapper's `bot.ingest()` does not validate the `X-Telegram-Bot-Api-Secret-Token` header — you must check it in your HTTP layer.

---

## 📂 File Structure

```
serverless-webhook-starter/
├── src/
│   └── local-dev.ts    # Minimal local HTTP server for dev tunnel testing
├── .env.example         # Required environment variable template
├── package.json         # Scripts and dependencies
└── README.md            # This file
```

---

## 🏗️ How This Fits the Architecture

```
 Telegram Bot API
       │
       │  POST /webhook (JSON update)
       ▼
  HTTP Handler (Cloudflare Worker / Lambda / Node HTTP)
       │
       ▼
  bot.ingest(update)  ← same API regardless of platform
       │
       ├─► [Middleware Pipeline]
       ├─► Router dispatch → Handlers
       └─► bot.sendMessage(...) → Telegram Bot API
```

This starter uses **Core only** (no Redis, no Observability). For stateful serverless bots, add [`adapter-redis`](../../packages/adapter-redis) to persist sessions across invocations. See [SYSTEM_ARCHITECTURE.md](../../docs/SYSTEM_ARCHITECTURE.md) for the full layer map.

---

## 🔗 Next Steps

- Add session + rate limiting → [`multi-instance-redis-starter`](../multi-instance-redis-starter)
- Add structured telemetry → [`@jilimb0/tgwrapper-observability`](../../packages/observability)
- Platform-specific adapters → [`examples/aws-lambda`](../aws-lambda), [`examples/cloudflare-worker`](../cloudflare-worker)
- Read the full architecture map → [`docs/SYSTEM_ARCHITECTURE.md`](../../docs/SYSTEM_ARCHITECTURE.md)
