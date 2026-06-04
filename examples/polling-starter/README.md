# Polling Starter

> **Stability:** Early Production · **Runtime:** Node.js ≥ 18 · **Mode:** Long-polling

A clean, self-contained template demonstrating the canonical **polling** mode setup for TGWrapper. Best suited for local development, single-server deployments, and any environment where you maintain persistent process uptime.

---

## ✨ What This Demonstrates

| Capability | Implementation |
| :--- | :--- |
| **Zero-dependency bot runtime** | Core package only — no Redis, no external services |
| **Typed update handlers** | Full TypeScript inference on all Telegram update shapes |
| **Graceful shutdown** | `SIGTERM` stops the loop cleanly after the current batch |
| **Error boundary** | `bot.on('error', ...)` captures runtime and API failures |
| **Echo + command routing** | `/start` command + catch-all text echo in < 30 lines |

> **When to upgrade:** Once you need persistent state, add the [`multi-instance-redis-starter`](../multi-instance-redis-starter). Once you need edge/serverless, switch to [`serverless-webhook-starter`](../serverless-webhook-starter).

---

## 🏗️ Architecture

```
Telegram Bot API
      │
      │  getUpdates (long-poll, 30 s timeout)
      ▼
 BotRuntime polling loop
      │
      ├─► Error Handler middleware
      │
      └─► Message / Command Handlers
                │
                └─► bot.sendMessage(...)
```

The polling loop runs inside a single Node.js process. There is no external broker; updates are fetched sequentially by offset.

---

## 🛠️ Getting Started

### 1. Copy and fill environment variables

```bash
cp .env.example .env
# then open .env and set your BOT_TOKEN
```

`.env.example`:
```env
# Required — obtain from @BotFather on Telegram
BOT_TOKEN="your_telegram_bot_token"
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Run locally

```bash
BOT_TOKEN="<your_token>" pnpm start
```

---

## 🔬 Smoke Test

Run a type-check (no live bot token needed):

```bash
pnpm test
```

Manual functional check:
1. Start the bot: `BOT_TOKEN="<token>" pnpm start`
2. Open Telegram, send `/start` — expect: **"polling-starter ready"**
3. Send any text message — expect: **"echo: \<your message\>"**

---

## 🚀 Production Notes

| Concern | Recommendation |
|---|---|
| Process uptime | Run under `pm2`, `systemd`, or inside a Docker container with `restart: always` |
| Multiple instances | **Not supported** with polling. Only one instance should poll a given token at a time |
| Rate limiting | Default in-memory rate limiter is single-process only; switch to Redis adapter for multi-node setups |
| Observability | Attach `@jilimb0/tgwrapper-observability` to gain structured logs and metrics |
| Graceful shutdown | `SIGTERM` will stop the polling loop after the current update batch completes |

---

## ⚠️ Known Limitations

- **Single-instance only.** Running two polling processes against the same token will cause update races and duplicate deliveries.
- **No webhook support.** To deploy to Cloudflare Workers or AWS Lambda, switch to webhook mode (see `serverless-webhook-starter`).
- **In-memory state.** The bot in this template has no session persistence. Restarting the process loses all in-flight state.
- **Cold start latency.** First `getUpdates` call after process start may block up to `timeoutSeconds` before the loop warms up.

---

## 📂 File Structure

```
polling-starter/
├── bot.ts          # Bot entry point
├── .env.example    # Required environment variable template
├── package.json    # Scripts and dependencies
└── README.md       # This file
```

---

## 🏗️ How This Fits the Architecture

```
Telegram Bot API
      │  getUpdates (long-poll)
      ▼
 BotRuntime (polling loop) ← single Node.js process
      │
      ├─► Error Handler middleware
      └─► Message / Command Handlers → bot.sendMessage(...)
```

This starter uses **Core only**. It is the entry-level layer of the TGWrapper stack. See [SYSTEM_ARCHITECTURE.md](../../docs/SYSTEM_ARCHITECTURE.md) for how it fits alongside Redis and Observability.

---

## 🔗 Next Steps & Team Evaluation

- **Port to Redis Sessions:** Add distributed rate limiting + sessions → [`multi-instance-redis-starter`](../multi-instance-redis-starter)
- **Scale to Production:** Deploy serverless to Cloudflare / Lambda → [`serverless-webhook-starter`](../serverless-webhook-starter)
- **Add Telemetry:** Add structured logs + metrics → [`@jilimb0/tgwrapper-observability`](../../packages/observability)
- **Convince Your Team:** Share the [Convince Your Team Guide](../../docs/champion/CONVINCE_YOUR_TEAM.md) and [Team Evaluation Checklist](../../docs/champion/TEAM_EVALUATION_CHECKLIST.md) with your architecture team.
- **Pilot Implementation:** Use the [Internal Pilot Playbook](../../docs/champion/PILOT_PLAYBOOK.md) to migrate your first staging service.
