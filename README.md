# TGWrapper

Production-grade Telegram bot framework focused on reliability, typed API contracts, and serverless/runtime portability.

## Packages

- `@jilimb0/tgwrapper` - core runtime, typed BotClient facade, router, FSM, transports, adapters
- `@jilimb0/tgwrapper-adapter-redis` - Redis sessions, cache namespaces, and distributed rate limiter
- `@jilimb0/tgwrapper-observability` - logging, metrics, runtime binding, and snapshot helpers

## Telegram API Baseline

- Target compatibility baseline: **Telegram Bot API 9.4**
- Baseline file: `docs/telegram-api-baseline.json`
- Compatibility contract: `docs/TELEGRAM_API_COMPATIBILITY.md`

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

## Release Policy

Releases are CI-gated via Changesets and GitHub Actions.
Manual local publish is not the supported path.

Use:

- `docs/RELEASE_POLICY.md`
- `docs/RELEASE_CHECKLIST_1.0.0.md`
