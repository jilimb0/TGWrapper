# TGWrapper Moderation & Support Bot Starter

A reference implementation of a production-grade Telegram moderation and support bot built with TGWrapper. Demonstrates structured tickets FSM flow (open → pending → resolved), distributed session management, user rate limiting, and structured telemetry operations.

---

## 🚀 What This Demonstrates

| Feature / Pattern | Implementation Detail |
| :--- | :--- |
| **FSM Ticket States** | Manages a user ticketing lifecycle state machine stored in session memory |
| **Distributed Sessions** | Uses the Redis session adapter to store active ticket state |
| **Anti-Spam Limiting** | Integrates Redis rate-limiting to protect moderators from user floods |
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
   {"timestamp":"2026-06-04T12:00:00Z","level":"INFO","event":"ticket.opened","chatId":987654,"traceId":"a1b2c3d4..."}
   ```
5. Spam messages fast to verify the Redis rate limiter triggers a temporary block.
