# TGWrapper Moderation & Support Bot Starter

> **Requirements:** Node.js `>=22.13`, `pnpm`, `tsx`, Redis `>=6.2`
> **Use case:** production-grade moderation and support bot with Redis session state, rate limiting, and structured logs.

A reference implementation of a production-grade Telegram moderation and support bot built with TGWrapper. Demonstrates structured tickets FSM flow (open → pending → resolved), distributed session management, user rate limiting, and structured telemetry operations.

---

## 🚀 What This Demonstrates

| Feature / Pattern        | Implementation Detail                                                     |
| :----------------------- | :------------------------------------------------------------------------ |
| **FSM Ticket States**    | Manages a user ticketing lifecycle state machine stored in session memory |
| **Distributed Sessions** | Uses the Redis session adapter to store active ticket state               |
| **Anti-Spam Limiting**   | Integrates Redis rate-limiting to protect moderators from user floods     |
| **Ops Logs Correlation** | Emits JSON structured logs tracking moderation updates with trace context |

---

## 🏗️ Architecture

```
  [User Message] ──> [TGWrapper Intake] ──> [Redis Session (Check State)]
                             │
                             ├──> [Redis Rate Limiter (Anti-Spam)]
                             │         │
                             │         └──> (Limit Breached) ──> [Reject User / Lock]
                             │
                             ├──> [FSM Router]
                             │         │
                             │         ├──> State: NEW ─────> [Open Support Ticket]
                             │         └──> State: OPEN ────> [Forward to Moderators]
                             │
                             └──> [Structured Logger emits metrics / traceId]
```

---

## 📂 Project Structure

- `src/bot.ts` — Main bot client, ticket lifecycle routers, rate limiter configuration, and state-machine transitions.
- `.env.example` — Configuration environment variables.
- `package.json` — Scripts and pinned dependency packages.

---

## 🛠️ Getting Started

### 1. Configuration

Copy the template configuration file:

```bash
cp .env.example .env
```

Set up your credentials and local environment configuration:

```env
BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
REDIS_URL="redis://127.0.0.1:6379"
MODERATOR_CHAT_ID="-100123456789" # Chat ID of moderation queue
```

### 2. Local Execution

```bash
# Install dependencies
pnpm install

# Start the bot locally in polling mode (connects to local Redis)
pnpm start
```

---

## 🧪 Smoke Testing

1. Start your local Redis instance.
2. Start the bot (`pnpm start`).
3. Send `/ticket` to the bot chat.
4. Verify stdout displays FSM state transitions:
   ```json
   {
     "timestamp": "2026-06-04T12:00:00Z",
     "level": "INFO",
     "event": "ticket.opened",
     "chatId": 987654,
     "traceId": "a1b2c3d4..."
   }
   ```
5. Spam messages fast to verify the Redis rate limiter triggers a temporary block.

## What You Still Need to Implement

- Your moderator assignment and queueing backend, including persistent agent state.
- Secret management for `BOT_TOKEN`, `REDIS_URL`, and moderator credentials.
- Production telemetry exporter and trace aggregation pipeline.
- Graceful process lifecycle handling in your chosen deployment environment.

## How This Maps to Production

- This starter is a local polling/template prototype. For production, move the bot to webhook mode or a managed worker platform if you need horizontal scaling.
- Keep Redis shared across all instances and use a stable topology such as managed Redis or Sentinel.
- Route JSON logs and metrics to your log/telemetry pipeline, and include `traceId` in alerts for incident correlation.
- Store secrets in a dedicated vault or secret manager rather than environment variables in source control.
