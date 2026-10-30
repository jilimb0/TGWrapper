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
