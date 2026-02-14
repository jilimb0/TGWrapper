# API Stability Contract for 0.5.x

This document defines the public API contract that we commit to keep stable for `0.5.x`.

## Stable until 1.0

The following root exports from `/Users/jilimbo/Documents/Personal/TGWrapper/src/index.ts` are considered stable for all `0.5.x` releases:

- Core/runtime: `ApiClient`, `BotKernel`, `Context`, `SessionManager`, `TreeRouter`, `BotRuntime`
- Guards: `TokenBucketRateLimiter`, `BoundedConcurrencyQueue`, `QueueOverflowError`
- Storage: `MemorySessionStorage`, `RedisSessionStorage`
- Adapters: `AwsLambdaHandler`, `CloudflareWorkerHandler`, `NodeHttpHandler`, `WebhookHandler`
- Update loop: `PollingSource`, `WebhookSource`, `isFreshUpdate`, `isValidTelegramUpdate`
- Observability: `EcsJsonLogger`, `InMemoryMetrics`
- Tenant utils: `createSessionKey`, `createSessionNamespace`
- Error classes: `CircuitOpenError`, `CoreError`, `SessionConflictError`, `TelegramApiError`
- Type exports from `types/core` and `types/telegram`

## Experimental in 0.5.x

The following areas are available but explicitly **experimental** and may evolve before `1.0.0`:

- Runtime guard behavior tuning in `BotRuntime` (drop policy details and saturation strategy)
- Performance/chaos harness interfaces in `/Users/jilimbo/Documents/Personal/TGWrapper/test/load` and `/Users/jilimbo/Documents/Personal/TGWrapper/test/chaos`
- In-memory metrics backend internals (`InMemoryMetrics`) intended as a reference collector

## API Snapshot Guard

- Snapshot file: `/Users/jilimbo/Documents/Personal/TGWrapper/docs/api-snapshots/tgwrapper-index.d.ts`
- CI check: `pnpm api:snapshot:check`
- Intentional contract updates require:
  1. `pnpm build`
  2. `pnpm api:snapshot:update`
  3. Explicit review of snapshot diff in PR
