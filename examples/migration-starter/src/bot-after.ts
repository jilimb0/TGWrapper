import { createBotClient } from '@tgwrapper/core';
import { RedisSessionAdapter } from '@tgwrapper/adapter-redis';
import { attachBotObservability, MetricsRegistry } from '@tgwrapper/observability';
import { Redis } from 'ioredis';

// Migrated TGWrapper bot with Redis sessions (Compare-and-Swap safe) and tracing.
// Run this via: pnpm start:after

if (!process.env.BOT_TOKEN) {
  console.error('BOT_TOKEN environment variable is missing.');
  process.exit(1);
}

// 1. Establish Redis client
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

redis.on('error', (error) => {
  console.error(JSON.stringify({ event: 'redis.error', message: error.message }));
});

// Define type contract for sessions
interface RegistrationSession {
  version: number; // Required for CAS tracking
  step: 'idle' | 'awaiting_name' | 'awaiting_email';
  name?: string;
}

// 2. Setup Redis session adapter
const sessionStore = new RedisSessionAdapter<RegistrationSession>({
  redis,
  tenantId: 'prod',
  botId: 'register-bot',
  ttlSeconds: 3600 // 1 hour
});

// 3. Create client in polling mode (e.g. for development/local running)
const bot = createBotClient({
  token: process.env.BOT_TOKEN,
  mode: 'polling'
});

// 4. Attach telemetry (Prometheus metrics & JSON logging with Trace context)
const metrics = new MetricsRegistry();
attachBotObservability(bot, {
  metrics,
  logger: {
    log: (event) => console.log(JSON.stringify(event))
  },
  serviceName: 'registration-service'
});

// 5. Bot logic handlers
bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') return;
  
  const chatId = message.chat.id;
  const text = message.text;

  // Command handlers
  if (text === '/start') {
    await bot.sendMessage(chatId, 'Welcome! Use /register to start step state tracking.');
    return;
  }

  // Load session or initialize
  let session = await sessionStore.get(`chat:${chatId}`);
  if (!session) {
    session = { version: 1, step: 'idle' };
  }

  if (text === '/register') {
    session.step = 'awaiting_name';
    const writeResult = await sessionStore.compareAndSet(
      `chat:${chatId}`,
      session.version,
      { ...session, version: session.version + 1 }
    );
    if (!writeResult.ok) {
      console.warn('Session write conflict on /register');
    }
    await bot.sendMessage(chatId, 'Step 1: Please enter your name:');
    return;
  }

  if (session.step === 'awaiting_name') {
    session.name = text;
    session.step = 'awaiting_email';
    const writeResult = await sessionStore.compareAndSet(
      `chat:${chatId}`,
      session.version,
      { ...session, version: session.version + 1 }
    );
    if (!writeResult.ok) {
      console.warn('Session write conflict on name transition');
    }
    await bot.sendMessage(chatId, `Thanks, ${text}! Step 2: Please enter your email:`);
    return;
  }

  if (session.step === 'awaiting_email') {
    const name = session.name;
    // Reset session back to idle
    session.step = 'idle';
    session.name = undefined;
    const writeResult = await sessionStore.compareAndSet(
      `chat:${chatId}`,
      session.version,
      { ...session, version: session.version + 1 }
    );
    if (!writeResult.ok) {
      console.warn('Session write conflict on email completion');
    }
    await bot.sendMessage(chatId, `Registration complete!\nName: ${name}\nEmail: ${text}`);
    return;
  }

  // Echo fallback
  await bot.sendMessage(chatId, `Echo: ${text}`);
});

bot.on('error', (err) => {
  console.error(JSON.stringify({ event: 'bot.error', message: err instanceof Error ? err.message : String(err) }));
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

// Start polling
(async () => {
  console.log(JSON.stringify({
    event: 'startup',
    serviceName: 'registration-service',
    mode: 'polling',
    redisUrl
  }));
  await bot.start();
})().catch((error) => {
  console.error(JSON.stringify({ event: 'startup.failed', message: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});
