# Migration Cookbook

## A) Text message handler

```ts
bot.on('message', async (message) => {
  if (!('text' in message)) return;
  await bot.sendMessage(message.chat.id, message.text);
});
```

## B) Callback button handler

```ts
bot.on('callback_query', async (callback) => {
  await bot.answerCallbackQuery(callback.id, { text: 'Done' });
  if (callback.message) {
    await bot.editMessageReplyMarkup({
      chat_id: callback.message.chat.id,
      message_id: callback.message.message_id,
      reply_markup: { inline_keyboard: [] }
    });
  }
});
```

## C) Add Redis cache + index

```ts
const cache = kv.createCacheNamespace('cache');
await cache.setJson('settings:chat:1', { locale: 'en' }, 3600);
await cache.index.upsert('active_chats', '1');
```

## D) Add anti-spam

```ts
const limiter = createRateLimiter(kv, { windowMs: 60_000, limit: 20, blockDurationMs: 30_000 });
const state = await limiter.check(`user:${userId}`);
if (!state.allowed) {
  return;
}
```
