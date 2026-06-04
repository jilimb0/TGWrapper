import { createBotClient } from '@jilimb0/tgwrapper';
import { RedisSessionAdapter, RedisKvStore, createRateLimiter } from '@jilimb0/tgwrapper-adapter-redis';
import {
  attachBotObservability,
  MetricsRegistry,
  Tracer,
  getCorrelationContext,
} from '@jilimb0/tgwrapper-observability';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Conversation history stored in Redis with CAS protection. */
interface ChatSession {
  version: number;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  totalTokensUsed: number;
}

/** OpenAI chat completion response (minimal shape). */
interface ChatCompletionResponse {
  choices: Array<{ message: { role: string; content: string } }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BOT_TOKEN = process.env.BOT_TOKEN!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_HISTORY = 20; // keep last N messages per chat

if (!BOT_TOKEN) throw new Error('BOT_TOKEN is required');

// ---------------------------------------------------------------------------
// Infrastructure: Redis session, rate limiter, observability
// ---------------------------------------------------------------------------

// 1. Redis session adapter — CAS-protected, 24h TTL
const sessionAdapter = new RedisSessionAdapter<ChatSession>({
  redisUrl: REDIS_URL,
  tenantId: 'default',
  botId: 'ai-bot',
  ttlSeconds: 86400,
});

// 2. Distributed rate limiter — 10 requests per minute per user
const kvStore = new RedisKvStore({ redisUrl: REDIS_URL, prefix: 'ai_bot' });
const limiter = createRateLimiter(kvStore, {
  namespace: 'chat',
  windowMs: 60_000,
  limit: 10,
  blockDurationMs: 30_000,
});

// 3. Telemetry
const metrics = new MetricsRegistry();
const tracer = new Tracer();

// 4. Bot client
const bot = createBotClient({ token: BOT_TOKEN, mode: 'polling' });

attachBotObservability(bot, {
  metrics,
  logger: {
    log: (evt) => console.log(JSON.stringify(evt)),
  },
  serviceName: 'ai-bot-starter',
  tenantId: 'default',
  botId: 'ai-bot',
});

// ---------------------------------------------------------------------------
// OpenAI helper — traced, timeout-protected, token-tracked
// ---------------------------------------------------------------------------

async function callOpenAI(
  history: ChatSession['history'],
  signal?: AbortSignal,
): Promise<{ reply: string; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> {
  return tracer.withSpan('ai.chat_completion', async () => {
    const ctx = getCorrelationContext();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        // Propagate trace ID end-to-end for cross-service debugging
        ...(ctx.traceId ? { 'X-Trace-Id': ctx.traceId } : {}),
      },
      // Hard 30s timeout — prevents the handler from blocking indefinitely
      signal: signal ?? AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful Telegram bot assistant. Keep answers concise.' },
          ...history,
        ],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown');
      throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const reply = data.choices?.[0]?.message?.content ?? '(empty response)';
    const usage = data.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    // Log token usage into the trace context
    console.log(JSON.stringify({
      event: 'ai.completion',
      traceId: ctx.traceId,
      model: OPENAI_MODEL,
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
    }));

    // Record metric
    metrics.increment('ai_completions_total', { model: OPENAI_MODEL });
    metrics.increment('ai_tokens_total', { model: OPENAI_MODEL, type: 'prompt' }, usage.prompt_tokens);
    metrics.increment('ai_tokens_total', { model: OPENAI_MODEL, type: 'completion' }, usage.completion_tokens);

    return { reply, usage };
  }, { model: OPENAI_MODEL });
}

// ---------------------------------------------------------------------------
// Echo fallback — used when OPENAI_API_KEY is not set
// ---------------------------------------------------------------------------

async function echoFallback(text: string): Promise<string> {
  return `[echo-fallback] No OPENAI_API_KEY set. You said: ${text}`;
}

// ---------------------------------------------------------------------------
// Bot handlers
// ---------------------------------------------------------------------------

bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') return;
  const chatId = message.chat.id;
  const userId = String(message.from?.id ?? chatId);
  const text = message.text;

  // /start — reset conversation
  if (text === '/start') {
    await sessionAdapter.set(`chat:${chatId}`, {
      version: 1,
      history: [],
      totalTokensUsed: 0,
    });
    await bot.sendMessage(chatId, '🤖 AI Bot ready. Send me a message to start a conversation.\n\nCommands:\n/start — reset conversation\n/tokens — show token usage\n/clear — clear history');
    return;
  }

  // /tokens — show token stats
  if (text === '/tokens') {
    const session = await sessionAdapter.get(`chat:${chatId}`);
    const total = session?.totalTokensUsed ?? 0;
    const turns = session?.history?.length ?? 0;
    await bot.sendMessage(chatId, `📊 Token usage:\n• Total tokens used: ${total}\n• Conversation turns: ${turns}\n• Model: ${OPENAI_MODEL}`);
    return;
  }

  // /clear — clear history but keep stats
  if (text === '/clear') {
    const session = await sessionAdapter.get(`chat:${chatId}`);
    if (session) {
      await sessionAdapter.compareAndSet(`chat:${chatId}`, session.version, {
        ...session,
        version: session.version + 1,
        history: [],
      });
    }
    await bot.sendMessage(chatId, '🧹 Conversation history cleared.');
    return;
  }

  // --- Rate limit check ---
  const limitCheck = await limiter.check(`user:${userId}`);
  if (!limitCheck.allowed) {
    await bot.sendMessage(chatId, `⏳ Rate limit reached. Try again in ${limitCheck.retryAfter}s.`);
    return;
  }

  // --- Load session (or initialize) ---
  let session = await sessionAdapter.get(`chat:${chatId}`);
  if (!session) {
    session = { version: 1, history: [], totalTokensUsed: 0 };
  }

  // Add user message to history
  session.history.push({ role: 'user', content: text });

  // Trim history to MAX_HISTORY
  if (session.history.length > MAX_HISTORY) {
    session.history = session.history.slice(-MAX_HISTORY);
  }

  // --- Call OpenAI (or fallback) ---
  let replyText: string;

  if (!OPENAI_API_KEY) {
    replyText = await echoFallback(text);
  } else {
    try {
      const { reply, usage } = await callOpenAI(session.history);
      replyText = reply;
      session.totalTokensUsed += usage.total_tokens;
      session.history.push({ role: 'assistant', content: reply });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(JSON.stringify({ event: 'ai.error', error: errorMessage }));
      replyText = `⚠️ AI request failed: ${errorMessage}`;
    }
  }

  // --- Persist session with CAS ---
  const writeResult = await sessionAdapter.compareAndSet(
    `chat:${chatId}`,
    session.version,
    { ...session, version: session.version + 1 },
  );

  if (!writeResult.ok) {
    console.warn(JSON.stringify({
      event: 'session.cas_conflict',
      chatId,
      expectedVersion: session.version,
    }));
    // Still send the reply — the AI already generated it
  }

  // --- Send reply ---
  await bot.sendMessage(chatId, replyText);
});

bot.on('error', (err) => {
  console.error(JSON.stringify({ event: 'bot.error', error: String(err) }));
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

console.log(`Starting AI Bot Starter (model: ${OPENAI_MODEL})...`);
await bot.start();
