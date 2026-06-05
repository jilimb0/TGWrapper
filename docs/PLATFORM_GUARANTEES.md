# Platform Guarantees And Non-Guarantees

This document unifies package-level promises into one language of truth.

## Guaranteed When Used In Scope

| Guarantee | Scope | Evidence |
| --- | --- | --- |
| Typed public contracts | Public TypeScript API | Typecheck and API snapshot gates. |
| Core package buildability | Supported Node.js release target | `pnpm build`, `pnpm -r build`, CI verify jobs. |
| No silent Redis CAS overwrite | `@tgwrapper/adapter-redis` session writes | Atomic Lua compare-and-set; conflicts return `ok: false`. |
| Atomic Redis sliding-window evaluation | `@tgwrapper/adapter-redis` rate limiter | Redis Lua script integration tests. |
| Starter package contents | `@tgwrapper/starter-*`, `@tgwrapper/create` | `pnpm pack:starters`. |
| Published package smoke path | Packages already live on npm | `scripts/published-smoke.mjs`. |

## Guaranteed Only With Caveats

| Claim | Caveat |
| --- | --- |
| Runtime portability | Capability-specific. Core webhook handling is portable; Redis TCP, polling, OpenTelemetry Node SDK, and graceful shutdown are not equally portable. |
| Benchmark throughput | Synthetic local/CI benchmark only; excludes Telegram API, Redis, app handler work, exporters, and network. |
| Observability correlation | Strong in Node.js via `AsyncLocalStorage`; partial or degraded in runtimes without equivalent async context support. |
| Serverless fit | Webhook mode fits serverless; long-running polling and background tasks need platform-native alternatives. |

## Not Guaranteed

- No universal "zero data loss" guarantee across crashes, bad Redis configuration, operator error, or cloud outages.
- No automatic Redis fallback to in-memory state in distributed deployments.
- No fair queueing in the Redis rate limiter.
- No built-in dashboard, log backend, alerting rules, or managed telemetry service.
- No identical behavior across Node.js, Lambda, Workers, Bun, and Deno for every package.
- No promise that starter templates update existing user projects after scaffolding.

## Wording Rule

Public docs should use this pattern:

> TGWrapper is designed for [capability] under [scope], with [caveat].

Avoid unqualified absolutes such as "best", "zero", "always", "identical everywhere", and "no rewrite ever".

