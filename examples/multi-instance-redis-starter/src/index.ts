import { createRateLimiter, RedisKvStore, RedisSessionAdapter } from '@tgwrapper/adapter-redis';
import { createBotClient } from '@tgwrapper/core';
import { attachBotObservability, MetricsRegistry } from '@tgwrapper/observability';

const BOT_TOKEN = process.env.BOT_TOKEN || 'fake-token-for-dev';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// 1. Initialize Redis KV Store
const store = new RedisKvStore({
  redisUrl: REDIS_URL,
  prefix: 'multi_instance_bot',
});

// 2. Initialize Distributed Rate Limiter (20 requests per minute)
const limiter = createRateLimiter(store, {
  namespace: 'chat_limits',
  windowMs: 60_000,
  limit: 20,
  blockDurationMs: 15_000,
});

// 3. Initialize Versioned Redis Session Adapter (24 hours TTL)
interface UserSession {
  version: number;
  messageCount: number;
}
const sessionAdapter = new RedisSessionAdapter<UserSession>({
  redisUrl: REDIS_URL,
  tenantId: 'default_tenant',
  botId: 'multi_instance',
  ttlSeconds: 86400,
});

// 4. Initialize Telemetry & Metrics Registry
const metrics = new MetricsRegistry();
const logger = {
  log: (evt: any) =>
    console.log(`[TELEMETRY] ${evt.level.toUpperCase()} - ${evt.event}:`, JSON.stringify(evt.data)),
};

// 5. Initialize Bot Client
const bot = createBotClient({
  token: BOT_TOKEN,
  mode: 'polling',
});

// Attach observability hooks
attachBotObservability(bot, {
  metrics,
  logger,
  serviceName: 'multi-instance-bot-service',
  tenantId: 'default_tenant',
  botId: 'multi_instance',
});

// Handle incoming messages
bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') return;

  const userId = message.from?.id?.toString() || 'unknown';
  const chatId = message.chat.id;

  // Evaluate Distributed Rate Limiter
  const limitCheck = await limiter.check(`user:${userId}`);
  if (!limitCheck.allowed) {
    await bot.sendMessage(
      chatId,
      `Rate limit exceeded. Please wait ${limitCheck.retryAfter} seconds.`,
    );
    return;
  }

  // Load and modify session via compareAndSet
  const sessionKey = `user:${userId}`;
  let session = await sessionAdapter.get(sessionKey);
  if (!session) {
    session = { version: 1, messageCount: 0 };
  }

  session.messageCount += 1;
  const writeResult = await sessionAdapter.compareAndSet(sessionKey, session.version, {
    ...session,
    version: session.version + 1,
  });

  if (!writeResult.ok) {
    // Retry state loading in production, fallback echo for dev
    console.warn('Session write conflict occurred due to concurrent updates.');
  }

  await bot.sendMessage(
    chatId,
    `Received: "${message.text}". Total messages in session: ${session.messageCount}.`,
  );
});

console.log('Starting Multi-Instance Redis Bot Template...');
bot.start().catch((err) => {
  console.error('Failed to start bot:', err);
});
