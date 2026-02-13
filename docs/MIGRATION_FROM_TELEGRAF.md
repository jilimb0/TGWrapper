# Migration from Telegraf

## API Mapping

- `bot.command('start', fn)` -> `router.command('/start', fn)`
- `bot.on('text', fn)` -> `router.regex(/.+/, fn)` or `router.use(fn)`
- `ctx.session` -> `ctx.session.data`
- Scenes/Wizard -> `router.scene('state', handlers, hooks)` + `ctx.scene.enter('state')`
- `bot.launch()` -> `new BotRuntime(source, kernel).start()`

## Middleware Chains -> Priority Router

Telegraf middleware often relies on ordering side effects. In TG Wrapper you model this with route priority:

1. State handlers (`priority` default 200)
2. Command handlers (`priority` default 100)
3. Callback handlers (`priority` default 70)
4. Regex handlers (`priority` default 50)
5. Fallback (`use`, priority 0)

## Session Safety

Telegraf session middlewares frequently overwrite state under concurrency. TG Wrapper enforces optimistic locking:

1. `SessionManager.load` reads `{value, version}`
2. Handler mutates session in-memory
3. `compareAndSet(expectedVersion)` commits atomically
4. On mismatch, transaction retries

## Webhook Migration

- Telegraf webhook callback -> `WebhookHandler`
- Node runtime -> `NodeHttpHandler`
- AWS Lambda -> `AwsLambdaHandler`
- Cloudflare Workers -> `CloudflareWorkerHandler`

## Practical Porting Steps

1. Extract handlers into pure async functions using `Context`.
2. Declare session type and state union.
3. Build transition map in `BotKernel`.
4. Replace middleware with explicit routes and priorities.
5. Run concurrency tests around critical flows (payments, onboarding).
