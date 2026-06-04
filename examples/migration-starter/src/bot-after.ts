import { createBotClient } from '@jilimb0/tgwrapper';
import { RedisSessionAdapter } from '@jilimb0/tgwrapper-adapter-redis';
import { attachBotObservability, MetricsRegistry } from '@jilimb0/tgwrapper-observability';
import Redis from 'ioredis';

// Migrated TGWrapper bot with Redis sessions (Compare-and-Swap safe) and tracing.
// Run this via: pnpm start:after

if (!process.env.BOT_TOKEN) {
  console.error('BOT_TOKEN environment variable is missing.');
  process.exit(1);
}

// 1. Establish Redis client
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

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
  mode: 'polling',
  session: {
    store: sessionStore,
    initialState: () => ({
      version: 1,
      step: 'idle'
    })
  }
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

  if (text === '/register') {
    // Atomic session transition
    await bot.updateSession<RegistrationSession>(chatId, (session) => {
      session.step = 'awaiting_name';
    });
    await bot.sendMessage(chatId, 'Step 1: Please enter your name:');
    return;
  }

  // Session state handler
  const session = await bot.getSession<RegistrationSession>(chatId);

  if (session.step === 'awaiting_name') {
    await bot.updateSession<RegistrationSession>(chatId, (s) => {
      s.name = text;
      s.step = 'awaiting_email';
    });
    await bot.sendMessage(chatId, `Thanks, ${text}! Step 2: Please enter your email:`);
    return;
  }

  if (session.step === 'awaiting_email') {
    const name = session.name;
    // Reset session back to idle
    await bot.updateSession<RegistrationSession>(chatId, (s) => {
      s.step = 'idle';
      s.name = undefined;
    });
    await bot.sendMessage(chatId, `Registration complete!\nName: ${name}\nEmail: ${text}`);
    return;
  }

  // Echo fallback
  await bot.sendMessage(chatId, `Echo: ${text}`);
});

bot.on('error', (err) => {
  console.error('Core Bot Error:', err);
});

// Start polling
(async () => {
  console.log('TGWrapper bot is running...');
  await bot.start();
})();
