# Migration Cookbook

Common patterns translated from Telegraf/grammY to TGWrapper.

## A) Text message handler

```ts
// Telegraf
bot.on('text', (ctx) => ctx.reply(ctx.message.text));

// TGWrapper
bot.on('message', async (ctx) => {
  if (!ctx.text) return;
  await ctx.reply(ctx.text);
});
```

## B) Callback button handler

```ts
// Telegraf
bot.action('btn_data', (ctx) => ctx.answerCbQuery('Done'));

// TGWrapper
bot.on('callback_query', async (ctx) => {
  if (ctx.callbackQuery?.data !== 'btn_data') return;
  await ctx.answerCallbackQuery({ text: 'Done' });
});
```

## C) Inline keyboard with buttons

```ts
// Telegraf
bot.on('text', (ctx) => ctx.reply('Choose:', {
  reply_markup: { inline_keyboard: [[{ text: 'Yes', callback_data: 'yes' }]] }
}));

// TGWrapper
bot.on('message', async (ctx) => {
  await ctx.reply('Choose:', {
    reply_markup: {
      inline_keyboard: [[{ text: 'Yes', callback_data: 'yes' }]],
    },
  });
});
```

## D) Conversation state (FSM)

```ts
// Telegraf (using WizardScene)
const wizard = new WizardScene('onboarding', (ctx) => {
  ctx.reply('Name?');
  ctx.wizard.next();
}, (ctx) => {
  const name = ctx.message.text;
  ctx.session.name = name;
  ctx.reply('Age?');
  ctx.wizard.next();
});

// TGWrapper (using SessionManager + router)
const router = new TreeRouter();
router.on('message:text', async (ctx) => {
  const session = await ctx.session;
  if (!session.state) {
    session.state = { step: 'name' };
    await ctx.reply('Name?');
    return;
  }
  if (session.state.step === 'name') {
    session.data = { ...session.data, name: ctx.text };
    session.state.step = 'age';
    await ctx.reply('Age?');
    return;
  }
  if (session.state.step === 'age') {
    session.data = { ...session.data, age: ctx.text };
    session.state.step = 'done';
    await ctx.reply(`Saved: ${JSON.stringify(session.data)}`);
  }
});
```

## E) File upload (photo/document)

```ts
// Telegraf
bot.on('photo', (ctx) => ctx.replyWithPhoto(ctx.message.photo[0].file_id));

// TGWrapper
bot.on('message', async (ctx) => {
  const photo = ctx.message?.photo;
  if (!photo?.length) return;
  await ctx.replyWithPhoto(photo[0].file_id, { caption: 'Got it!' });
});
```

## F) Webhook mode

```ts
// Telegraf
bot.launch({ webhook: { domain: 'example.com' } });

// TGWrapper
import { WebhookHandler, createBotClient } from '@tgwrapper/core';

const bot = createBotClient({ token: process.env.BOT_TOKEN!, session: { type: 'memory' } });
const handler = new WebhookHandler(bot, { token: process.env.BOT_TOKEN! });

export const POST = handler.handle.bind(handler);
```

## G) Error handling

```ts
// Telegraf
bot.catch((err) => console.error('Error:', err));

// TGWrapper
bot.on('error', (err) => {
  console.error('Bot error:', err instanceof Error ? err.message : err);
  // Or use EcsJsonLogger for structured logging
  logger.error('bot_error', { error: err instanceof Error ? err.message : String(err) });
});
```

## H) Rate limiting

```ts
// Telegraf (using telegraf-ratelimit)
bot.use(rateLimit({ window: 1000, limit: 5 }));

// TGWrapper
import { TokenBucketRateLimiter } from '@tgwrapper/core';

const limiter = new TokenBucketRateLimiter({ capacity: 5, fillRate: 5 });

bot.on('message', async (ctx) => {
  if (!limiter.tryConsume(ctx.from?.id.toString() ?? 'unknown')) {
    await ctx.reply('Too fast!');
    return;
  }
  // handle message ...
});
```

## I) Send typing indicator

```ts
// Telegraf
ctx.sendChatAction('typing');

// TGWrapper
await ctx.sendChatAction('typing');
```

## J) Get chat member info

```ts
// Telegraf
const member = await ctx.getChatMember(ctx.from.id);

// TGWrapper
const member = await ctx.getChatMember(ctx.chat.id, ctx.from.id);
console.log(member.status); // 'member' | 'administrator' | 'creator' | ...
```

## K) Redis session storage

```ts
// grammY (session middleware)
bot.use(session({ initial: () => ({ count: 0 }) }));

// TGWrapper (explicit session storage)
import { RedisSessionStorage } from '@tgwrapper/core';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
const storage = new RedisSessionStorage({ client: redis, ttlSeconds: 3600 });

const bot = createBotClient({
  token: process.env.BOT_TOKEN!,
  storage,
});
```

## L) Graceful shutdown

```ts
// Telegraf
process.once('SIGINT', () => bot.stop('SIGINT'));

// TGWrapper
process.once('SIGINT', async () => {
  await poller.stop();
  process.exit(0);
});
```
