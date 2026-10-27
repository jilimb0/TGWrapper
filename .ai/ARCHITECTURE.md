# Architecture: TGWrapper

## 1. Identity & Domain
TGWrapper — Production-grade resilience wrapper for Telegram Bot API with token bucket rate limiting, circuit breaker, and strict TypeScript types.
- **Status:** active
- **Remote:** `https://github.com/jilimb0/TGWrapper.git`
- **Default Branch:** `main`

## 2. Stack & Runtime
- **Runtime:** TypeScript, ESM/CJS dual build, Redis, Vitest, Biome.
- **Directories:** `src`, `packages`, `scripts`, `test`, `benchmark`

## 3. Structural Invariants
- Never crash the hosting process on unhandled Telegram network drops (use retry policies).
- Rate limiter in `src/` must enforce Telegram's 30 msg/sec global and 1 msg/sec per chat limits.
- All Telegram API schemas and updates must be validated with zero implicit type coercion.

## 4. Data Flows & External Boundaries
- Inbound requests are validated at perimeter boundaries using strict schemas.
- Outbound third-party calls must employ timeouts, retries with backoff, and circuit breakers.
- Zero secrets or unredacted customer PII in logs or storage snapshots.
