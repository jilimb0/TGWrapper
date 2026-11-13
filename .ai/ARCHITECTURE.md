# Architecture: TGWrapper

## 1. Identity & Domain
TGWrapper (`@tgwrapper/core`) — Zero-dependency, serverless-first Telegram Bot API, FSM, Telegram Mini Apps (`./tma`), and Payments (`./payments`) framework.
- **Status:** active
- **Remote:** `https://github.com/jilimb0/TGWrapper.git`
- **Default Branch:** `main`

## 2. Stack & Runtime
- **Runtime:** TypeScript, Node.js (>=24.0), Dual ESM/CJS (`dist`, `dist-cjs`), Biome, Vitest, Changesets.
- **Directories:** `src`, `scripts`, `docs`

## 3. Structural Invariants
- `@tgwrapper/core` must maintain zero external runtime bot-framework dependencies and stay within the package size budget (`pnpm pack:size`).
- Public exports (`.`, `./tma`, `./payments`) must pass `pnpm api:snapshot:check` and TypeScript 6/7 compatibility (`pnpm typecheck:compat`).
- Telegram Bot API types, payloads, and results in `src/` must remain 100% synchronized with `docs/telegram-api-schema.snapshot.json`.

## 4. Data Flows & External Boundaries
- Inbound webhook updates and TMA `InitData` are validated at perimeter boundaries using cryptographic HMAC signatures.
- Outbound Telegram Bot API calls must enforce rate-limit token buckets, `retry_after` 429 handling, and Full-Jitter backoff.
- Zero bot tokens or unredacted customer PII in logs or error stack traces.

## 5. Active ADRs
- **[ADR-0001](.ai/adr/0001-zero-dependency-serverless-fsm-and-schema-parity.md)** (`src/**`, `scripts/**`, `docs/**`): Zero-dependency core with dual ESM/CJS build, automated Telegram Bot API schema generation/drift gates, API snapshot lock, and >=180k UPS throughput baseline.
- **[ADR-0002](.ai/adr/0002-atomic-cas-session-management-and-storage-adapters.md)** (`src/storage/**`, `packages/adapter-*/**`): Atomic Compare-And-Swap (CAS) state versioning, multi-engine session adapters (Redis, DynamoDB, MongoDB), and automatic memory fallback (`FailsafeSessionStorage`).
- **[ADR-0003](.ai/adr/0003-resilient-transport-circuit-breaker-and-jittered-backoff.md)** (`src/core/**`, `src/adapters/**`): Outbound Telegram API resilience via TokenBucket rate limiting, Full Jitter exponential backoff, and tri-state CircuitBreaker.
- **[ADR-0004](.ai/adr/0004-structured-telemetry-opentelemetry-and-zero-pii-leakage.md)** (`src/observability/**`, `packages/observability/**`): Structured JSON logging, AsyncLocalStorage trace correlation, OpenTelemetry semantic conventions, and zero bot token/PII leakage.
- **[ADR-0005](.ai/adr/0005-cas-approval-gates-and-timing-safe-webhook.md)** (`src/adapters/webhook-handler.ts`, `src/orchestration/**`, `packages/observability/**`): In TGWrapper, facing race conditions between Web and Telegram approvals and timing attacks on webhooks, we implement ApprovalGateBotBridge using SessionManager CAS and crypto.timingSafeEqual in webhook-handler.
