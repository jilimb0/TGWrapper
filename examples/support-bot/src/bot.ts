import { createBotClient } from '@jilimb0/tgwrapper';
import { RedisSessionAdapter } from '@jilimb0/tgwrapper-adapter-redis';
import { attachBotObservability, MetricsRegistry } from '@jilimb0/tgwrapper-observability';
import Redis from 'ioredis';

if (!process.env.BOT_TOKEN) {
  console.error('BOT_TOKEN is required.');
  process.exit(1);
}

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface SupportSession {
  version: number;
  status: 'idle' | 'waiting_queue' | 'in_chat';
  assignedAgentId?: number;
}

const sessionStore = new RedisSessionAdapter<SupportSession>({
  redis,
  tenantId: 'prod',
  botId: 'support-bot'
});

const bot = createBotClient({
  token: process.env.BOT_TOKEN,
  mode: 'polling',
  session: {
    store: sessionStore,
    initialState: () => ({ version: 1, status: 'idle' })
  }
});

// Telemetry
attachBotObservability(bot, {
  metrics: new MetricsRegistry(),
  logger: { log: (e) => console.log(JSON.stringify(e)) },
  serviceName: 'support-routing-service'
});

// In-memory simple agent directory (in prod, query from a DB/Redis)
const AVAILABLE_AGENTS = [999991, 999992]; 

bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') return;
  const chatId = message.chat.id;
  const text = message.text;

  const session = await bot.getSession<SupportSession>(chatId);

  // Command: Start a support ticket
  if (text === '/support') {
    await bot.updateSession<SupportSession>(chatId, (s) => {
      s.status = 'waiting_queue';
    });
    await bot.sendMessage(chatId, 'Connecting you to an agent. Please write your question below:');
    return;
  }

  // Routing Logic based on status
  if (session.status === 'waiting_queue') {
    // Select agent and update session atomically (CAS)
    const agentId = AVAILABLE_AGENTS[Math.floor(Math.random() * AVAILABLE_AGENTS.length)];
    await bot.updateSession<SupportSession>(chatId, (s) => {
      s.status = 'in_chat';
      s.assignedAgentId = agentId;
    });

    await bot.sendMessage(chatId, `You are now connected to Agent #${agentId}. How can they help you?`);
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

(async () => {
  console.log('Support Routing Bot started...');
  await bot.start();
})();
