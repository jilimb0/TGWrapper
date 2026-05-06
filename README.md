# TGWrapper

Production-grade Telegram bot framework focused on reliability, typed API contracts, and serverless/runtime portability.

## Quick Start (5 minutes)

Install:

```bash
pnpm add @jilimb0/tgwrapper
```

Create `src/bot.ts`:

```ts
import { createBotClient } from '@jilimb0/tgwrapper';

const bot = createBotClient({
  token: process.env.BOT_TOKEN!,
  mode: 'polling',
  polling: { timeoutSeconds: 30, limit: 100 }
});

bot.on('message', async (message) => {
  if (!('text' in message) || typeof message.text !== 'string') return;

  if (message.text === '/start') {
    await bot.sendMessage(message.chat.id, 'TGWrapper bot is ready.');
    return;
  }

  await bot.sendMessage(message.chat.id, `Echo: ${message.text}`);
});

bot.on('error', (error) => {
  console.error('Bot runtime error', error);
});

await bot.start();
```

Run:

```bash
BOT_TOKEN="<your_bot_token>" node --import tsx src/bot.ts
```

## Webhook Example

```ts
import { createBotClient } from '@jilimb0/tgwrapper';

const bot = createBotClient({
  token: process.env.BOT_TOKEN!,
  mode: 'webhook'
});

await bot.start();

export async function handleWebhook(update: unknown): Promise<void> {
  bot.ingest(update);
}
```

## Production Rate Limiter (Redis)

```ts
import { RedisKvStore, createRateLimiter } from '@jilimb0/tgwrapper-adapter-redis';

const kv = new RedisKvStore({
  redisUrl: process.env.REDIS_URL!,
  prefix: 'mybot'
});

const limiter = createRateLimiter(kv, {
  namespace: 'spam',
  windowMs: 60_000,
  limit: 20,
  blockDurationMs: 30_000
});

const state = await limiter.check('user:123');
if (!state.allowed) {
  console.log('Rate limited. Retry after:', state.retryAfter);
}
```

## Packages

- `@jilimb0/tgwrapper` - core runtime, typed BotClient facade, router, FSM, transports, adapters
- `@jilimb0/tgwrapper-adapter-redis` - Redis sessions, cache namespaces, and distributed rate limiter
- `@jilimb0/tgwrapper-observability` - logging, metrics, runtime binding, and snapshot helpers

## Telegram API Baseline

- Target compatibility baseline: **Telegram Bot API 9.4**
- Baseline file: `docs/telegram-api-baseline.json`
- Compatibility contract: `docs/TELEGRAM_API_COMPATIBILITY.md`

## Rate Limiting Note

- `TokenBucketRateLimiter` from core is in-memory and intended for single-instance/dev usage.
- For production multi-instance/serverless deployments, use distributed limiter from `@jilimb0/tgwrapper-adapter-redis` (`createRateLimiter(...)`).

## Quick Project Validation

```bash
pnpm install
pnpm test
pnpm build
pnpm verify:release
```

For release-grade validation:

```bash
pnpm verify:1.0
```

## Build a Bot

Start here:

- Full step-by-step guide: `docs/BOT_DEVELOPMENT_GUIDE.md`
- Template bot: `examples/template-bot`

## Examples

- Polling starter: `examples/polling-bot.ts`
- Node HTTP webhook: `examples/node-http`
- AWS Lambda webhook: `examples/aws-lambda`
- Cloudflare Worker webhook: `examples/cloudflare-worker`
- Full template (polling + webhook): `examples/template-bot`

## Documentation

- Documentation index: `docs/DOCUMENTATION.md`
- 1.0 release definition of done: `docs/DEFINITION_OF_DONE_1.0.0.md`
- 1.0 release plan: `docs/RELEASE_1.0.0_PLAN.md`
- Production checklist: `docs/PRODUCTION_CHECKLIST.md`
- Release policy: `docs/RELEASE_POLICY.md`
- Operations runbook: `docs/OPERATIONS_RUNBOOK.md`
- Observability contract: `docs/OBSERVABILITY_CONTRACT.md`

## Open Source

- License: `Apache-2.0` ([LICENSE](./LICENSE))
- Contributing guide: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Security policy: [SECURITY.md](./SECURITY.md)
- Code of conduct: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)

## Release Policy

Releases are CI-gated via Changesets and GitHub Actions.
Manual local publish is not the supported path.

Use:

- `docs/RELEASE_POLICY.md`
- `docs/RELEASE_CHECKLIST_1.0.0.md`
