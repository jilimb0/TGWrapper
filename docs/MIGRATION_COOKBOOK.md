# Migration Cookbook

## 1) Simple Echo Bot

### Telegraf
```ts
bot.on('text', (ctx) => ctx.reply(ctx.message.text));
```

### Framework
```ts
router.use(async (ctx) => {
  await ctx.reply(ctx.message?.text ?? '');
});
```

## 2) Wizard Scene (Step-by-step)

### Telegraf
```ts
wizard.step((ctx) => {
  ctx.wizard.state.name = ctx.message.text;
  return ctx.wizard.next();
});
```

### Framework
```ts
router.scene('await_name', [
  async (ctx) => {
    ctx.session.data.name = ctx.message?.text;
    await ctx.scene.enter('await_email');
  }
]);
```

## 3) Middleware migration

### Telegraf
```ts
bot.use(async (ctx, next) => {
  if (!ctx.from) return;
  await next();
});
```

### Framework
```ts
router.use(async (ctx) => {
  if (!ctx.fromId) return;
  // handler logic
});
```
