# TGWrapper AI Bot Starter

A showcase reference implementation demonstrating how to build **AI-native Telegram bots** using TGWrapper. Integrates conversational interfaces, multi-turn FSM state management, and telemetry traces for LLM interactions.

---

## 🚀 What This Demonstrates

| Feature / Pattern | Implementation Detail |
| :--- | :--- |
| **Conversational Context** | Persists conversation history across update boundaries using session memory |
| **LLM Tracing** | Instruments OpenAI calls inside standard custom traces to track performance |
| **Token Budgeting** | Captures input, output, and total token usage in structured telemetry events |
| **Context Propagation** | Propagates the update `traceId` context cleanly through asynchronous LLM calls |

---

## 🏗️ Architecture

AI assistants require tracking multi-step conversations and third-party model latencies:

```
  [User Message] ──> [TGWrapper Client] ──> [Load FSM Session]
                             │
                             ├──> [Tracer: withSpan("ai_generation")]
                             │         │
                             │         ├──> [Call LLM / OpenAI]
                             │         │
                             │         └──> [Log Tokens / Trace ID]
                             │
                             └──> [Dispatch Message Reply]
```

---

## 📂 Project Structure

- `src/bot.ts` — Main bot client, update handler, and OpenAI API invocation wrapper.
- `.env.example` — Environment configuration keys required.
- `package.json` — Declares scripts and pins framework module dependencies.

---

## 🛠️ Getting Started

### 1. Configuration
Copy the template configuration file:
```bash
cp .env.example .env
```

And provide your API credentials:
```env
BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
OPENAI_API_KEY="sk-proj-..."
```

### 2. Local Execution
```bash
# Install dependencies
pnpm install

# Start the bot locally in polling mode
pnpm start
```

---

## 🧪 Smoke Testing

You can smoke-test the AI integration locally:
1. Start the bot process (`pnpm start`).
2. Send a query to your bot: `"What is the capital of France?"`.
3. Check the console stdout. You should see structured logs correlating the query:
   ```json
   {"timestamp":"2026-06-04T12:00:00Z","level":"INFO","event":"ai_generation","durationMs":452,"traceId":"8f8b8a8b...","prompt_tokens":15,"completion_tokens":8}
   ```

---

## 🛡️ Production Hardening Checklist
- **Rate Limit Check:** Ensure you attach the distributed Redis rate limiter to prevent users from flooding the LLM endpoint and exhausting token budgets.
- **Context Size Limit:** Limit FSM conversation history length stored in the session to avoid hitting Redis memory limits.
- **Error Boundaries:** Wrap OpenAI API calls in try-catch-finally loops to capture rate limits (429) or token capacity errors, returning a clean fallback message to the user.

