import { createBotClient } from '@jilimb0/tgwrapper';
import { RedisKvStore, RedisSessionAdapter, createRateLimiter } from '@jilimb0/tgwrapper-adapter-redis';
import { attachBotObservability, MetricsRegistry } from '@jilimb0/tgwrapper-observability';

// 1. Initial State Definitions
interface TicketSession {
  version: number;
  state: 'idle' | 'awaiting_description' | 'open';
  ticketId?: string;
  description?: string;
}

const MODERATOR_CHAT_ID = process.env.MODERATOR_CHAT_ID!;
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

if (!process.env.BOT_TOKEN) {
  console.error("Error: BOT_TOKEN is not defined in environment.");
  process.exit(1);
}

// 2. Initialize Core & Adapter Clients
const redisStore = new RedisKvStore({ redisUrl: REDIS_URL });
const sessionAdapter = new RedisSessionAdapter<TicketSession>({
  redisUrl: REDIS_URL,
  tenantId: 'default',
  botId: 'moderation-bot',
  ttlSeconds: 86400 // Expire session state after 24h
});

const bot = createBotClient({
  token: process.env.BOT_TOKEN,
  mode: 'polling',
  // Inject session adapter into the client options
  session: {
    store: sessionAdapter,
    initialState: () => ({ version: 1, state: 'idle' })
  }
});

// 3. Attach Structured Observability Instrumentation
const metrics = new MetricsRegistry();
attachBotObservability(bot, {
  metrics,
  logger: {
    log: (event) => console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...event }))
  },
  serviceName: 'moderation-support-service'
});

// 4. Instantiate Anti-Spam Rate Limiter (Max 5 requests per 10 seconds)
const rateLimiter = createRateLimiter(redisStore, {
  namespace: 'moderation_bot_limiter',
  windowMs: 10_000,
  limit: 5,
  blockDurationMs: 30_000 // Temporary block for 30s if spammed
});

// 5. Setup Update Lifecycle Handlers
bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') return;

  const chatId = message.chat.id;
  const userId = message.from?.id ? String(message.from.id) : String(chatId);

  // Apply Rate Limit Check
  const rateLimit = await rateLimiter.check(userId);
  if (!rateLimit.allowed) {
    await bot.sendMessage(chatId, `⚠️ Anti-Spam Lockout. Please wait ${rateLimit.retryAfter} seconds before replying.`);
    return;
  }

  // Load versioned session (retrieved via RedisSessionAdapter behind context)
  const session = await bot.getSession<TicketSession>(chatId);
  const currentState = session.state;

  // Command: /ticket (Start Flow)
  if (message.text === '/ticket') {
    if (currentState === 'open') {
      await bot.sendMessage(chatId, "You already have an open support ticket. Please wait for a moderator to respond.");
      return;
    }

    // Set state atomically
    await bot.updateSession<TicketSession>(chatId, (state) => {
      state.state = 'awaiting_description';
      state.ticketId = Math.random().toString(36).slice(2, 9).toUpperCase();
    });

    await bot.sendMessage(chatId, "🎟️ Creating support ticket. Please enter a short description of your issue:");
    return;
  }

  // Command: /resolve (Close Active Flow)
  if (message.text === '/resolve') {
    if (currentState !== 'open') {
      await bot.sendMessage(chatId, "No active ticket found to resolve. Use /ticket to open one.");
      return;
    }

    await bot.updateSession<TicketSession>(chatId, (state) => {
      state.state = 'idle';
      state.description = undefined;
      state.ticketId = undefined;
    });

    await bot.sendMessage(chatId, "✅ Support ticket resolved. Thank you!");
    return;
  }

  // FSM Handler: Awaiting Description Input
  if (currentState === 'awaiting_description') {
    const description = message.text;
    const ticketId = session.ticketId;

    await bot.updateSession<TicketSession>(chatId, (state) => {
      state.state = 'open';
      state.description = description;
    });

    // Notify moderation channel (in production, MODERATOR_CHAT_ID is configured)
    if (MODERATOR_CHAT_ID) {
      try {
        await bot.sendMessage(
          MODERATOR_CHAT_ID,
          `🎫 **NEW SUPPORT TICKET**\nTicket ID: \`${ticketId}\`\nUser ID: \`${userId}\`\nDescription: "${description}"\n\nResolve using \`/resolve\` command in user chat.`
        );
      } catch (err) {
        console.error("Failed to notify moderator chat channel:", err);
      }
    }

    await bot.sendMessage(chatId, `🎫 Ticket \`${ticketId}\` has been opened. Our moderation team will get back to you shortly.\nUse \`/resolve\` to close it.`);
    return;
  }

  // Default Echo fallback for general queries
  await bot.sendMessage(chatId, `Received: "${message.text}". Enter \`/ticket\` to open a support line.`);
});

bot.on('error', (err) => {
  console.error("Bot update processor error encountered:", err);
});

console.log("Starting moderation support bot reference app...");
await bot.start();
