import { createBotClient } from '@jilimb0/tgwrapper';
import { RedisSessionAdapter, RedisKvStore, createRateLimiter } from '@jilimb0/tgwrapper-adapter-redis';
import { attachBotObservability, MetricsRegistry } from '@jilimb0/tgwrapper-observability';
import Redis from 'ioredis';

// Verify environment variables
if (!process.env.BOT_TOKEN) {
  console.error('CRITICAL: BOT_TOKEN is not set.');
  process.exit(1);
}

// 1. Initialize Redis Client
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

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
  ttlSeconds: 86400 // 24 hours
});

// 3. Initialize the TGWrapper Bot Client
const bot = createBotClient({
  token: process.env.BOT_TOKEN,
  mode: 'polling', // Polling for dev. In prod swap to 'webhook'
  session: {
    store: sessionAdapter,
    initialState: () => ({
      version: 1,
      clickCount: 0
    })
  }
});

// 4. Attach Observability & Structured JSON Logging
const metrics = new MetricsRegistry();
attachBotObservability(bot, {
  metrics,
  logger: {
    log: (event) => console.log(JSON.stringify(event))
  },
  serviceName: 'standard-bot-service'
});

// 5. Setup Distributed Rate Limiting (15 requests per minute per user)
const rateLimitStore = new RedisKvStore({ redis });
const limiter = createRateLimiter(rateLimitStore, {
  namespace: 'rate-limiting',
  windowMs: 60000,
  limit: 15,
  blockDurationMs: 10000
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
    await bot.sendMessage(chatId, 'Hello! This is a production blueprint bot. Type /click to increment state.');
    return;
  }

  // Route: /click
  if (text === '/click') {
    // Atomic session write operation
    await bot.updateSession<UserSession>(chatId, (session) => {
      session.clickCount++;
      session.lastMessageTime = Date.now();
    });

    const session = await bot.getSession<UserSession>(chatId);
    await bot.sendMessage(chatId, `State Clicked: ${session.clickCount} times.`);
    return;
  }

  // Echo fallback
  await bot.sendMessage(chatId, `Echo: ${text}`);
});

bot.on('error', (err) => {
  console.error('System Error:', err);
});

// Start processing
(async () => {
  console.log('Standard TGWrapper Bot is launching...');
  await bot.start();
})();
