# TGWrapper

Serverless-first Telegram bot framework for Node.js. FSM session management, routing, rate limiting, circuit breaker, observability. Adapters for AWS Lambda, Cloudflare Workers, Node HTTP, webhooks.

## Tech Stack
- **Language:** TypeScript 6
- **Runtime:** Node.js >= 22.13
- **Monorepo:** pnpm workspace
- **Tests:** Vitest
- **Docs:** Typedoc
- **Versioning:** Changesets

## Commands
- `pnpm build` — ESM + CJS dual build (tsc)
- `pnpm test` — Vitest unit suite
- `pnpm typecheck` — tsc --noEmit
- `pnpm benchmark` — throughput benchmarks
- `pnpm verify:release:ci` — full release gate

## Conventions
- Split ESM (`dist/`) and CJS (`dist-cjs/`) output
- Telegram API schema codegen pipeline
- API snapshot testing, package size budgets
- Chaos, load, and integration tests
- Changeset-based versioning
