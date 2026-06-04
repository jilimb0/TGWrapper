# Grow with TGWrapper

TGWrapper meets you where you are. Start with 15 lines of code and no infrastructure. Add Redis when you need shared state. Add observability when you need to debug production. Add rate limiting when you need fairness at scale.

Every stage is a natural response to a real need — not a prerequisite you have to learn upfront.

---

## Stage 1: First bot (5 minutes)

**You need:** a working bot that responds to messages.

```bash
pnpm add @tgwrapper/core
```

```typescript
import { createBotClient } from '@tgwrapper/core';

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'polling' });

bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') return;
  if (message.text === '/start') {
    await bot.sendMessage(message.chat.id, 'Hello!');
    return;
  }
  await bot.sendMessage(message.chat.id, `Echo: ${message.text}`);
});

await bot.start();
```

**What you have:** a polling bot that echoes messages. Zero external dependencies.

**When to move on:** when you need user state that survives a process restart.

→ [Quick Start](./QUICK_START.md) · [polling-starter example](../examples/polling-starter)

---

## Stage 2: Commands and routing

**You need:** a bot that handles multiple commands without a wall of `if/else`.

```typescript
bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') return;
  const chatId = message.chat.id;
  const text = message.text;

  // Route commands
  if (text === '/start') return await bot.sendMessage(chatId, 'Welcome!');
  if (text === '/help') return await bot.sendMessage(chatId, 'Available: /start, /help, /info');
  if (text === '/info') return await bot.sendMessage(chatId, `Chat ID: ${chatId}`);

  // Default: echo
  await bot.sendMessage(chatId, `Echo: ${text}`);
});

// Handle button taps
bot.on('callback_query', async (callback) => {
  if (!callback.data) return;
  await bot.answerCallbackQuery(callback.id, { text: `You tapped: ${callback.data}` });
});
```

**What you have:** clean routing with typed handlers. No middleware chain to learn.

**When to move on:** when you need to remember something about the user between messages.

→ [Bot Development Guide](./BOT_DEVELOPMENT_GUIDE.md)

---

## Stage 3: Persistent sessions (single instance)

**You need:** user state that survives restarts — conversation steps, preferences, counters.

```bash
pnpm add @tgwrapper/adapter-redis ioredis
```

```typescript
import { RedisSessionAdapter } from '@tgwrapper/adapter-redis';

interface UserSession {
  version: number;
  step: 'idle' | 'awaiting_name';
  name: string;
}

const session = new RedisSessionAdapter<UserSession>({
  redisUrl: process.env.REDIS_URL!,
  tenantId: 'prod',
  botId: 'my-bot',
  ttlSeconds: 86400,
});

bot.on('message', async (message) => {
  if (!('text' in message)) return;
  const chatId = message.chat.id;
  const key = `chat:${chatId}`;

  let state = await session.get(key);
  if (!state) state = { version: 1, step: 'idle', name: '' };

  if (message.text === '/register') {
    await session.compareAndSet(key, state.version, { ...state, version: state.version + 1, step: 'awaiting_name' });
    await bot.sendMessage(chatId, 'What is your name?');
    return;
  }

  if (state.step === 'awaiting_name') {
    await session.compareAndSet(key, state.version, { ...state, version: state.version + 1, step: 'idle', name: message.text! });
    await bot.sendMessage(chatId, `Nice to meet you, ${message.text}!`);
  }
});
```

**What you have:** typed sessions in Redis with CAS protection. State survives restarts. Safe if you ever run a second instance.

**When to move on:** when you need to debug a production incident and `console.log` isn't cutting it.

→ [Redis Runtime Guide](./REDIS_RUNTIME.md) · [multi-instance-redis-starter](../examples/multi-instance-redis-starter)

---

## Stage 4: Structured observability

**You need:** trace IDs in every log line, structured events, metrics — without building it yourself.

```bash
pnpm add @tgwrapper/observability
```

```typescript
import { attachBotObservability, MetricsRegistry } from '@tgwrapper/observability';

const metrics = new MetricsRegistry();

attachBotObservability(bot, {
  metrics,
  logger: { log: (evt) => console.log(JSON.stringify(evt)) },
  serviceName: 'my-bot',
});
```

**One function call.** Every update now gets:
- A unique `traceId` — filter one user's journey across all logs
- Structured event fields — `updateId`, `chatId`, `handlerName`, `durationMs`
- Pull-based metrics — ready for Prometheus/Grafana

**When to move on:** when you need to run 2+ bot instances behind a load balancer.

→ [Telemetry Reference](./TELEMETRY_REFERENCE.md) · [Observability Contract](./OBSERVABILITY_CONTRACT.md)

---

## Stage 5: Multi-instance + distributed rate limiting

**You need:** two or more bot instances sharing state without conflicts.

```typescript
import { RedisKvStore, createRateLimiter } from '@tgwrapper/adapter-redis';

const kv = new RedisKvStore({ redisUrl: process.env.REDIS_URL!, prefix: 'my-bot' });
const limiter = createRateLimiter(kv, {
  namespace: 'user-limit',
  windowMs: 60_000,
  limit: 20,
  blockDurationMs: 30_000,
});

bot.on('message', async (message) => {
  const userId = String(message.from?.id ?? message.chat.id);
  const check = await limiter.check(`user:${userId}`);
  if (!check.allowed) {
    await bot.sendMessage(message.chat.id, `⏳ Rate limited. Retry in ${check.retryAfter}s.`);
    return;
  }
  // ... handler logic
});
```

**What you have:** the rate limit is shared across all instances via Redis. No per-instance counters that diverge under load.

CAS sessions from Stage 3 already protect you from concurrent session overwrites.

**When to move on:** when you need to deploy to serverless/edge or serve webhook traffic.

→ [multi-instance-redis-starter](../examples/multi-instance-redis-starter)

---

## Stage 6: Webhook + serverless deployment

**You need:** to stop polling and receive updates via webhook — required for Lambda, Workers, or any edge deployment.

```typescript
const bot = createBotClient({
  token: process.env.BOT_TOKEN!,
  mode: 'webhook',  // ← one config change
});

// In your serverless handler:
export default async function handler(request: Request): Promise<Response> {
  const update = await request.json();
  bot.ingest(update);
  return new Response('ok');
}
```

**Same handler code.** Same session adapter. Same observability. The only change is `mode: 'webhook'` and an HTTP entry point.

→ [serverless-webhook-starter](../examples/serverless-webhook-starter) · [AWS Lambda example](../examples/aws-lambda) · [Cloudflare Worker example](../examples/cloudflare-worker)

---

## Stage 7: AI-native bot

**You need:** an LLM-powered bot with conversation history, token tracking, and traced API calls.

This stage combines everything:
- Redis sessions for multi-turn conversation history
- Observability for LLM call tracing (model, tokens, latency)
- Rate limiting to protect your token budget
- Timeout contracts (`AbortSignal`) to prevent indefinite LLM hangs

→ [ai-bot-starter](../examples/ai-bot-starter) — full runnable reference implementation

---

## Complexity at a glance

| Stage | Packages | Infrastructure | Complexity |
| :--- | :--- | :--- | :--- |
| 1. First bot | `tgwrapper` | None | ⭐ |
| 2. Commands | `tgwrapper` | None | ⭐ |
| 3. Sessions | `+ adapter-redis` | Redis (1 node) | ⭐⭐ |
| 4. Observability | `+ observability` | None extra | ⭐⭐ |
| 5. Multi-instance | All packages | Redis + load balancer | ⭐⭐⭐ |
| 6. Webhook/serverless | All packages | Redis + webhook ingress | ⭐⭐⭐⭐ |
| 7. AI-native | All packages + LLM key | Redis + LLM API | ⭐⭐⭐⭐ |

You don't need to plan for Stage 7 on day one. Start where you are. Each stage answers a real need when you feel it.

---

## See also

- [Quick Start](./QUICK_START.md) — first bot in 5 minutes
- [Tutorials](./TUTORIALS.md) — step-by-step learning path
- [Production Checklist](./PRODUCTION_CHECKLIST.md) — hardening before launch
- [Why TGWrapper?](./WHY_TGWRAPPER.md) — when and why it matters
