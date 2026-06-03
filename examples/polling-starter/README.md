# TGWrapper Polling Starter

A clean, production-grade template demonstrating the canonical **polling** mode setup. Ideal for local development, stateful backend environments, or single-instance deployments.

---

## 🏗️ Architecture

```mermaid
graph LR
    Telegram[Telegram Bot API] -- GetUpdates Request -- LongPoll[Long Polling Loop]
    LongPoll --> Client[TGWrapper BotClient]
    Client --> Middleware[Error Handling / Core Router]
    Middleware --> Handler[Update/Message Handler]
```

---

## 🛠️ Getting Started

### 1. Configuration
Create a `.env` file (or set environment variables):
```env
BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
```

### 2. Local Execution
```bash
# Install dependencies
pnpm install

# Build the bot script
pnpm build

# Run the polling loop
BOT_TOKEN="<your_token>" pnpm start
```

---

## 🚀 Production Notes
- **Process Manager:** For production, run the polling process under a supervisor like `pm2` or inside a Docker container with an auto-restart policy.
- **In-Memory Rate Limiter:** The default setup uses an in-memory token bucket rate limiter. If you scale to multiple instances, switch to the Redis adapter distributed rate limiter.
- **Observability:** Connect metrics registries to monitor loop latency and API call counts.
