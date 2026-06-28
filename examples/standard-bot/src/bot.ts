import { createRateLimiter, RedisKvStore, RedisSessionAdapter } from '@tgwrapper/adapter-redis';
import { createBotClient } from '@tgwrapper/core';
import { attachBotObservability, MetricsRegistry } from '@tgwrapper/observability';
import { Redis } from 'ioredis';

// Verify environment variables
if (!process.env.BOT_TOKEN) {
  console.error('CRITICAL: BOT_TOKEN is not set.');
  process.exit(1);
}

// 1. Initialize Redis Client
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

redis.on('error', (error) => {
  console.error(JSON.stringify({ event: 'redis.error', message: error.message }));
});

// Define your state contract
interface UserSession {
  version: number; // Mandatory for CAS validation
  clickCount: number;
  lastMessageTime?: number;
}

// 2. Setup Redis Session Adapter
const sessionAdapter = new RedisSessionAdapter<UserSession>({
  redis,
  tenantId: 'prod',
  botId: 'standard-bot',
  ttlSeconds: 86400, // 24 hours
});

// 3. Initialize the TGWrapper Bot Client
const bot = createBotClient({
  token: process.env.BOT_TOKEN,
  mode: 'polling', // Polling for dev. In prod swap to 'webhook'
});

// 4. Attach Observability & Structured JSON Logging
const metrics = new MetricsRegistry();
attachBotObservability(bot, {
  metrics,
  logger: {
    log: (event) => console.log(JSON.stringify(event)),
  },
  serviceName: 'standard-bot-service',
});

// 5. Setup Distributed Rate Limiting (15 requests per minute per user)
const rateLimitStore = new RedisKvStore({ redis });
const limiter = createRateLimiter(rateLimitStore, {
  namespace: 'rate-limiting',
  windowMs: 60000,
  limit: 15,
  blockDurationMs: 10000,
});

// 6. Router logic & Command handlers
bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') return;

  const chatId = message.chat.id;
  const userId = String(message.from?.id || chatId);
  const text = message.text;

  // Check rate limiting
  const check = await limiter.check(`user:${userId}`);
  if (!check.allowed) {
    await bot.sendMessage(chatId, 'Too many requests. Please slow down.');
    return;
  }

  // Route: /start
  if (text === '/start') {
    await bot.sendMessage(
      chatId,
      'Hello! This is a production blueprint bot. Type /click to increment state.',
    );
    return;
  }

  // Route: /click
  if (text === '/click') {
    // Load session
    let session = await sessionAdapter.get(`chat:${chatId}`);
    if (!session) {
      session = { version: 1, clickCount: 0 };
    }

    session.clickCount++;
    session.lastMessageTime = Date.now();

    // Atomic CAS write
    const writeResult = await sessionAdapter.compareAndSet(`chat:${chatId}`, session.version, {
      ...session,
      version: session.version + 1,
    });

    if (!writeResult.ok) {
      console.warn(JSON.stringify({ event: 'session.cas_conflict', chatId }));
    }

    await bot.sendMessage(chatId, `State Clicked: ${session.clickCount} times.`);
    return;
  }

  // Echo fallback
  await bot.sendMessage(chatId, `Echo: ${text}`);
});

bot.on('error', (err) => {
  console.error(
    JSON.stringify({
      event: 'bot.error',
      message: err instanceof Error ? err.message : String(err),
    }),
  );
});

let isShuttingDown = false;
async function shutdown(signal: NodeJS.Signals) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(JSON.stringify({ event: 'shutdown.start', signal }));
  await bot.stop();
  await redis.quit();
  console.log(JSON.stringify({ event: 'shutdown.complete', signal }));
}

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});
process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});

// Start processing
(async () => {
  console.log(
    JSON.stringify({
      event: 'startup',
      serviceName: 'standard-bot-service',
      mode: 'polling',
      redisUrl,
      rateLimit: { windowMs: 60000, limit: 15 },
    }),
  );
  await bot.start();
})().catch((error) => {
  console.error(
    JSON.stringify({
      event: 'startup.failed',
      message: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(1);
});
