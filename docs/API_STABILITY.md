# API Stability Policy

This document defines the API stability guarantees for `@tgwrapper/*` packages.

## Versioning

TGWrapper follows **semantic versioning** (SemVer 2.0.0): `MAJOR.MINOR.PATCH`.

- **MAJOR** — breaking changes to the public API
- **MINOR** — new features, deprecations (backward-compatible)
- **PATCH** — bug fixes, internal improvements (fully backward-compatible)

## Public API

The following exports from `@tgwrapper/core` are considered **stable** and will not break without a MAJOR version bump:

### Classes

- `ApiClient` — Telegram API HTTP client
- `BotKernel` — Core event processing kernel
- `Context` — Update context object
- `CircuitBreaker` — API circuit breaker
- `SessionManager` — FSM session management
- `TreeRouter` — Pattern-based message routing
- `BotRuntime` — Bot lifecycle management
- `MemorySessionStorage` — In-memory session storage
- `RedisSessionStorage` — Redis session storage (CAS)
- `TokenBucketRateLimiter` — In-memory rate limiter
- `BoundedConcurrencyQueue` — Concurrency limiter
- `EcsJsonLogger` — ECS-compatible JSON logger
- `InMemoryMetrics` — Metrics collector
- `PollingSource` — Long-polling update source
- `WebhookSource` — Webhook update source
- `MockApiClient`, `MockBotClient` — Testkit mocks
- `AwsLambdaHandler`, `CloudflareWorkerHandler`, `NodeHttpHandler`, `WebhookHandler` — Runtime adapters

### Functions

- `createBotClient` — High-level bot client factory
- `isFreshUpdate`, `isValidTelegramUpdate` — Update validation
- `createCallbackUpdate`, `createMessageUpdate` — Test update factories
- `createSessionKey`, `createSessionNamespace` — Tenant key helpers
- `createRuntimeHooks`, `createApiHooks` — Observability hooks

### Error Classes

- `CircuitOpenError`, `CoreError`, `SessionConflictError`, `TelegramApiError`, `QueueOverflowError`

### Sub-package Stability

| Package | Status | Notes |
|---------|--------|-------|
| `@tgwrapper/core` | Stable (v1.0+) | Public API defined above |
| `@tgwrapper/adapter-redis` | Stable | Redis storage, rate limiting, caching |
| `@tgwrapper/observability` | Stable | Tracing, metrics, structured logging |

## Beta / Internal Exports

Symbols not listed in `src/index.ts` are considered **internal** and may change without notice.

## Deprecation Process

1. A deprecation warning is added in a MINOR release
2. The deprecated symbol remains for at least 1 MAJOR cycle
3. Removal happens in the next MAJOR release

## Breaking Changes

The following constitute a breaking change:

- Removing or renaming a public export
- Changing a function signature
- Adding a required parameter without a default
- Removing a type or interface property
- Changing error class behavior

The following are NOT breaking:

- Adding new exports
- Adding optional parameters
- Widening accepted types
- Bug fixes that change runtime behavior
