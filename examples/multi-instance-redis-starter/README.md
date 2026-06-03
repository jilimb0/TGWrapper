# Multi-Instance Redis Starter

> **Stability:** Early Production · **Runtime:** Node.js ≥ 18 + Redis ≥ 6.2 · **Mode:** Polling with distributed coordination

A complete, high-fidelity reference implementation showing how to run **multiple coordinated bot instances** backed by Redis for distributed session management, rate limiting, and structured observability.

This is the template to use when a single polling process is not enough, or when you need user state to survive process restarts.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                 Telegram Bot API                 │
└──────────────────────┬──────────────────────────┘
                       │  getUpdates (each instance polls independently)
          ┌────────────┴────────────┐
          ▼                         ▼
  ┌───────────────┐         ┌───────────────┐
  │  Bot Node 1   │         │  Bot Node 2   │
  │  (polling)    │         │  (polling)    │
  └───────┬───────┘         └───────┬───────┘
          │                         │
          └──────────┬──────────────┘
                     │  ioredis
                     ▼
          ┌──────────────────────┐
          │       Redis          │
          │  ┌────────────────┐  │
          │  │ Session Store  │  │  ← versioned CAS writes
          │  ├────────────────┤  │
          │  │  Rate Limiter  │  │  ← Lua sliding window
          │  └────────────────┘  │
          └──────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │    Observability     │  ← structured JSON events + metrics
          └──────────────────────┘
```

Key properties:
- **Session safety:** All session writes use `compareAndSet` (CAS) via Lua scripts to prevent overwrite races between concurrent nodes.
- **Distributed rate limiting:** Sliding-window counter stored in Redis — shared across all nodes.
- **Structured telemetry:** Every update, error, and state change emits a structured event through the observability layer.

---

## 🛠️ Getting Started

### 1. Start a Redis instance

```bash
# Docker (quickest)
docker run --name bot-redis -p 6379:6379 -d redis:7-alpine

# Or point to an existing Redis URL
```

### 2. Copy and fill environment variables

```bash
cp .env.example .env
```

`.env.example`:
```env
# Required — obtain from @BotFather on Telegram
BOT_TOKEN="your_telegram_bot_token"
# Required — Redis connection URL
REDIS_URL="redis://127.0.0.1:6379"
# Optional — log level for observability output (default: info)
LOG_LEVEL="info"
```

### 3. Install dependencies and start

```bash
pnpm install
pnpm start
```

To simulate multiple instances locally, open two terminals and run `pnpm start` in each. Both will poll and share Redis state.

---

## 🔬 Smoke Test

Type-check (no live services required):

```bash
pnpm test
```

Functional integration check:
1. Start Redis: `docker run --name bot-redis -p 6379:6379 -d redis:7-alpine`
2. Set env vars and run: `BOT_TOKEN="<token>" REDIS_URL="redis://localhost:6379" pnpm start`
3. Send `/start` → expect acknowledgment with session counter
4. Send any text → expect `"Received: ... Total messages in session: N"`
5. Restart the process → send another message → session counter should **resume from N**, not reset
6. Check console for `[TELEMETRY]` lines on each update

---

## 🚀 Production Notes

| Concern | Recommendation |
|---|---|
| Redis topology | Single-node Redis is fine for most bots; for HA use Redis Sentinel or Redis Cluster (see `docs/REDIS_RUNTIME.md`) |
| Session TTL | Default is 24 h (`ttlSeconds: 86400`); tune per your user activity patterns |
| Rate limit window | Default is 20 req/min per user; tune `windowMs` and `limit` to match your bot's policy |
| CAS conflicts | On high concurrency, CAS writes may conflict; implement a retry loop in production handlers |
| Observability export | Console logger is shown for brevity; wire a real exporter (OTEL, Datadog) per `docs/TELEMETRY_REFERENCE.md` |
| Graceful shutdown | Send `SIGTERM`; the polling loop drains the current batch before exit |

---

## ⚠️ Known Limitations

- **Polling is still one-token-per-process.** Multiple instances sharing the same bot token via polling will race for updates. This template demonstrates state coordination, not load-balancing of update delivery. For true horizontal scaling of update ingestion, use webhook mode.
- **CAS is optimistic, not pessimistic.** High-velocity concurrent writes to the same session key will produce conflicts. You must handle `writeResult.ok === false` with retry logic in real applications.
- **Redis is a hard dependency.** If Redis is unavailable, the bot will fail to load sessions and rate limiter checks. Implement a fallback or circuit breaker for resilience.
- **In-memory observability only.** The console logger in this example is for illustration. Replace it with a real structured logging pipeline before shipping to production.
- **No webhook support shown.** This template uses polling for simplicity. For serverless + Redis, combine webhook ingestion with this session/rate-limit pattern manually.

---

## 📂 File Structure

```
multi-instance-redis-starter/
├── src/
│   └── index.ts         # Bot entry point: Redis init, rate limiter, session, observability
├── .env.example          # Required environment variable template
├── package.json          # Scripts and dependencies
└── README.md             # This file
```

---

## 🔗 Related Documentation

- [Redis Runtime Guide](../../docs/REDIS_RUNTIME.md) — topologies, locking guarantees, failure modes
- [Telemetry Reference](../../docs/TELEMETRY_REFERENCE.md) — event schemas, exporter configs, debugging
- [Production Checklist](../../docs/PRODUCTION_CHECKLIST.md) — pre-launch validation steps
