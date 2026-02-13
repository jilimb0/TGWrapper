# Framework Core

Production-grade Telegram Bot Framework with serverless-first architecture, native FSM, optimistic locking, and ecosystem packages.

## Packages

- `@jilimb0/tgwrapper` - framework kernel, transport, router, FSM, adapters
- `@jilimb0/tgwrapper-adapter-redis` - ioredis-backed atomic session storage
- `@jilimb0/tgwrapper-observability` - ECS JSON logger and metrics helpers

## Quick start

```bash
pnpm install
pnpm test
pnpm build
```

## Integration tests (Redis)

```bash
docker compose -f docker-compose.redis.yml up -d
REDIS_URL=redis://127.0.0.1:6379 pnpm test:integration
```

## Deploy examples

- Node HTTP: `pnpm --dir examples/node-http dev`
- AWS Lambda: `pnpm --dir examples/aws-lambda deploy`
- Cloudflare Worker: `pnpm --dir examples/cloudflare-worker deploy`

All examples require env vars (`BOT_TOKEN`, `WEBHOOK_SECRET`) and do not hardcode secrets.

## Release

Releases are CI-gated only via Changesets workflow.
Manual local publishing is not part of supported flow.
See `/Users/jilimbo/Documents/Personal/TGWrapper/docs/RELEASE_POLICY.md` for semver and process details.
