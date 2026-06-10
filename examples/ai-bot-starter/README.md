# TGWrapper AI Bot Starter

A **runnable** reference implementation demonstrating how to build AI-native Telegram bots with TGWrapper. Sends user messages to OpenAI, persists multi-turn conversation history in Redis with CAS protection, traces every LLM call, and tracks token usage per chat.

> Without an `OPENAI_API_KEY`, the bot falls back to echo mode — you can still test the Redis session, rate limiting, and observability flows.
>
> **Requirements:** Node.js `>=22.13`, `pnpm`, `tsx`, Redis `>=6.2`
> **Use case:** AI-native Telegram bot with session history, CAS safety, and observability.

---

## What this demonstrates

| Feature                       | Implementation                                                                                                       |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| **Multi-turn conversation**   | Persists `{ role, content }[]` history in Redis — survives restarts and works across instances                       |
| **CAS session protection**    | `compareAndSet()` prevents concurrent instances from silently overwriting conversation state                         |
| **LLM call tracing**          | Every OpenAI call is wrapped in `tracer.withSpan('ai.chat_completion')` — duration, model, and token counts attached |
| **Token tracking**            | `prompt_tokens`, `completion_tokens`, `total_tokens` logged per request and aggregated per chat via session          |
| **Distributed rate limiting** | Redis sliding-window limiter — 10 requests/min per user, shared across all bot instances                             |
| **Structured telemetry**      | `attachBotObservability()` adds `traceId`, `spanId`, structured events to every update                               |
| **Timeout contracts**         | `AbortSignal.timeout(30_000)` on OpenAI fetch — no indefinite hangs                                                  |
| **Graceful fallback**         | Missing API key → echo mode. OpenAI error → user-visible error message, not a crash                                  |

---

## Architecture

```
[User Message] ──> [TGWrapper Client] ──> [Rate Limiter (Redis)]
                         │
                         ├──> [Load Session (Redis CAS)]
                         │         │
                         │         ├──> history[] + totalTokensUsed
                         │
                         ├──> [Tracer: withSpan("ai.chat_completion")]
                         │         │
                         │         ├──> [OpenAI API — fetch + AbortSignal]
                         │         │
                         │         └──> [Log: tokens, model, traceId]
                         │
                         ├──> [CAS Write Session (version + 1)]
                         │
                         └──> [Send Reply]
```

---

## Project structure

```
ai-bot-starter/
├── src/
│   └── bot.ts          # Main bot — handlers, OpenAI integration, session, tracing
├── .env.example        # Required environment variables
├── package.json        # Dependencies: tgwrapper, adapter-redis, observability
└── README.md
```

---

## Getting started

### 1. Prerequisites

- **Node.js >= 22.13**
- **Redis** running locally (`redis://localhost:6379`) or a remote instance
- **Telegram bot token** from [@BotFather](https://t.me/BotFather)
- **OpenAI API key** (optional — bot falls back to echo mode without it)

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your credentials
```

| Variable         | Required | Default                  | Description                             |
| :--------------- | :------- | :----------------------- | :-------------------------------------- |
| `BOT_TOKEN`      | Yes      | —                        | Telegram bot token                      |
| `OPENAI_API_KEY` | No       | —                        | OpenAI API key (omit for echo fallback) |
| `REDIS_URL`      | No       | `redis://localhost:6379` | Redis connection URL                    |
| `OPENAI_MODEL`   | No       | `gpt-4o-mini`            | OpenAI model to use                     |

### 3. Install & run

```bash
pnpm install
pnpm start
```

### 4. Test

Send messages to your bot in Telegram:

| Command    | What it does                            |
| :--------- | :-------------------------------------- |
| `/start`   | Reset conversation history              |
| `/tokens`  | Show total tokens used in this chat     |
| `/clear`   | Clear conversation history (keep stats) |
| _any text_ | Send to OpenAI and get a response       |

---

## What to look for in the logs

```json
{
  "event": "ai.completion",
  "traceId": "a1b2c3d4...",
  "model": "gpt-4o-mini",
  "prompt_tokens": 42,
  "completion_tokens": 18,
  "total_tokens": 60
}
```

Filter by `traceId` in your log aggregator to trace: user message → session load → OpenAI call → session write → reply sent.

---

## Production hardening checklist

- [ ] **Rate limit tuning** — adjust `limit` and `blockDurationMs` in the rate limiter config for your traffic
- [ ] **History size** — `MAX_HISTORY` is set to 20 messages; tune based on your model's context window and Redis memory
- [ ] **Token budget** — add a per-user daily token cap using the `totalTokensUsed` session field
- [ ] **Error boundaries** — the bot catches OpenAI errors but you may want retry logic for 429/503
- [ ] **Webhook mode** — switch from `polling` to `webhook` for production (see [serverless-webhook-starter](../serverless-webhook-starter))
- [ ] **Redis topology** — see [Redis Runtime Guide](../../docs/REDIS_RUNTIME.md) for Sentinel/Cluster setups

---

## What You Still Need to Implement

- A production-ready OpenAI token budget, retry policy, and rate-limit fallback behavior.
- A persistent session schema and history eviction strategy tuned to your usage patterns.
- Secret management for `BOT_TOKEN`, `OPENAI_API_KEY`, and `REDIS_URL`.
- A telemetry sink and alerting pipeline for trace IDs, rate-limit events, and model error handling.

## How This Maps to Production

- This starter runs polling locally; switch to webhook mode for production deployments on Node.js hosts or serverless functions.
- Keep Redis reachable from all instances and choose a topology that matches your latency and availability requirements.
- Store tokens, API keys, and Redis credentials in a secure vault, never in source control.
- Emit structured logs and metrics to a centralized pipeline, then correlate those with trace IDs for incident investigation.

---

## Related docs & Team Evaluation

- [Why TGWrapper?](../../docs/WHY_TGWRAPPER.md) — positioning and architectural wedge
- [Redis Runtime Guide](../../docs/REDIS_RUNTIME.md) — session topologies, failure modes
- [Telemetry Reference](../../docs/TELEMETRY_REFERENCE.md) — structured logs, metrics, traces
- [Team Evaluation Checklist](../../docs/champion/TEAM_EVALUATION_CHECKLIST.md) — checklist for auditing AI bots
- [Convince Your Team](../../docs/champion/CONVINCE_YOUR_TEAM.md) — one-pager comparison
- [Internal Pilot Playbook](../../docs/champion/PILOT_PLAYBOOK.md) — step-by-step POC migrations
- [Proof of Viability Guide](../../docs/PROOF_OF_VIABILITY.md) — 90-minute testing path
