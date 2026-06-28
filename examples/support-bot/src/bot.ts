import { RedisSessionAdapter } from '@tgwrapper/adapter-redis';
import { createBotClient } from '@tgwrapper/core';
import { attachBotObservability, MetricsRegistry } from '@tgwrapper/observability';
import { Redis } from 'ioredis';

if (!process.env.BOT_TOKEN) {
  console.error('BOT_TOKEN is required.');
  process.exit(1);
}

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

redis.on('error', (error) => {
  console.error(JSON.stringify({ event: 'redis.error', message: error.message }));
});

interface SupportSession {
  version: number;
  status: 'idle' | 'waiting_queue' | 'in_chat';
  assignedAgentId?: number;
}

const sessionStore = new RedisSessionAdapter<SupportSession>({
  redis,
  tenantId: 'prod',
  botId: 'support-bot',
});

const bot = createBotClient({
  token: process.env.BOT_TOKEN,
  mode: 'polling',
});

// Telemetry
attachBotObservability(bot, {
  metrics: new MetricsRegistry(),
  logger: { log: (e) => console.log(JSON.stringify(e)) },
  serviceName: 'support-routing-service',
});

// In-memory simple agent directory (in prod, query from a DB/Redis)
const AVAILABLE_AGENTS = [999991, 999992];

bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') return;
  const chatId = message.chat.id;
  const text = message.text;

  // Load session
  let session = await sessionStore.get(`chat:${chatId}`);
  if (!session) {
    session = { version: 1, status: 'idle' };
  }

  // Command: Start a support ticket
  if (text === '/support') {
    session.status = 'waiting_queue';
    const writeResult = await sessionStore.compareAndSet(`chat:${chatId}`, session.version, {
      ...session,
      version: session.version + 1,
    });
    if (!writeResult.ok) {
      console.warn('Session write conflict on /support');
    }
    await bot.sendMessage(chatId, 'Connecting you to an agent. Please write your question below:');
    return;
  }

  // Routing Logic based on status
  if (session.status === 'waiting_queue') {
    // Select agent and update session atomically (CAS)
    const agentId = AVAILABLE_AGENTS[Math.floor(Math.random() * AVAILABLE_AGENTS.length)];
    session.status = 'in_chat';
    session.assignedAgentId = agentId;

    const writeResult = await sessionStore.compareAndSet(`chat:${chatId}`, session.version, {
      ...session,
      version: session.version + 1,
    });
    if (!writeResult.ok) {
      console.warn('Session write conflict on queue connection');
    }

    await bot.sendMessage(
      chatId,
      `You are now connected to Agent #${agentId}. How can they help you?`,
    );
    return;
  }

  if (session.status === 'in_chat') {
    // Forward message payload to the assigned agent
    const agentId = session.assignedAgentId!;
    await bot.sendMessage(agentId, `[User ${chatId}]: ${text}`);
    return;
  }

  // Fallback
  await bot.sendMessage(chatId, 'Type /support to connect with our support agents.');
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

(async () => {
  console.log(
    JSON.stringify({
      event: 'startup',
      serviceName: 'support-routing-service',
      mode: 'polling',
      redisUrl,
      availableAgents: AVAILABLE_AGENTS.length,
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
