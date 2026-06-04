import { Telegraf, session } from 'telegraf';

// A typical Telegraf bot with stateful handlers and in-memory session.
// Run this via: pnpm start:before

if (!process.env.BOT_TOKEN) {
  console.error('BOT_TOKEN environment variable is missing.');
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// 1. Basic In-Memory Sessions (unreliable across multiple instances / restarts)
bot.use(session());

// 2. Custom simple logger middleware (no correlation, no traceId)
bot.use(async (ctx, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] Received update ID ${ctx.update.update_id}`);
  await next();
  console.log(`[${new Date().toISOString()}] Processed in ${Date.now() - start}ms`);
});

bot.command('start', async (ctx) => {
  await ctx.reply('Welcome! Use /register to start step state tracking.');
});

bot.command('register', async (ctx) => {
  const session = (ctx as any).session || {};
  session.step = 'awaiting_name';
  (ctx as any).session = session;
  await ctx.reply('Step 1: Please enter your name:');
});

bot.on('text', async (ctx) => {
  const session = (ctx as any).session;
  
  if (session && session.step === 'awaiting_name') {
    session.name = ctx.message.text;
    session.step = 'awaiting_email';
    (ctx as any).session = session;
    await ctx.reply(`Thanks, ${ctx.message.text}! Step 2: Please enter your email:`);
    return;
  }

  if (session && session.step === 'awaiting_email') {
    const name = session.name;
    // Reset state
    (ctx as any).session = {};
    await ctx.reply(`Registration complete!\nName: ${name}\nEmail: ${ctx.message.text}`);
    return;
  }

  // Echo fallback
  await ctx.reply(`Echo: ${ctx.message.text}`);
});

bot.launch().then(() => {
  console.log('Telegraf bot is running...');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
