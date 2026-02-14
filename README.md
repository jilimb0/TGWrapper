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

## Release Readiness Docs

- API stability contract: `/Users/jilimbo/Documents/Personal/TGWrapper/docs/API_STABILITY_0.5.md`
- Observability contract: `/Users/jilimbo/Documents/Personal/TGWrapper/docs/OBSERVABILITY_CONTRACT.md`
- Production checklist: `/Users/jilimbo/Documents/Personal/TGWrapper/docs/PRODUCTION_CHECKLIST.md`
- Migration notes (`0.4.0 -> 0.5.0`): `/Users/jilimbo/Documents/Personal/TGWrapper/docs/MIGRATION_0.4_TO_0.5.md`
- Release runbook checklist: `/Users/jilimbo/Documents/Personal/TGWrapper/docs/RELEASE_CHECKLIST_0.5.0.md`
- Next patch release checklist: `/Users/jilimbo/Documents/Personal/TGWrapper/docs/RELEASE_CHECKLIST_0.5.1.md`
- Current patch release checklist: `/Users/jilimbo/Documents/Personal/TGWrapper/docs/RELEASE_CHECKLIST_0.5.2.md`
