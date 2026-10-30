# ADR-0001: Zero-Dependency Serverless Core, Automated Telegram Schema Parity & Dual ESM/CJS Build

**Status:** Accepted  
**Date:** 2026-10-30  
**Deciders:** Core Engineering Team  
**Applies-To:** `src/**`, `scripts/**`, `docs/**`  
**Supersedes:** None  
**Overrides-Global:** None (`GLOBAL-TS-01`, `GLOBAL-RES-01`, `GLOBAL-RES-02`, `GLOBAL-PRIV-01`)  

## Y-Summary
In the context of `@tgwrapper/core` (`.`, `./tma`, `./payments`), facing cold-start overhead in serverless functions and frequent upstream Telegram Bot API updates, we decided for **a zero-dependency core with automated codegen/drift gates against `docs/telegram-api-schema.snapshot.json`, dual ESM/CJS compilation, and a locked API/size/throughput budget (>=180k UPS)** instead of wrapping `telegraf`/`grammy` or hand-maintaining types, to guarantee sub-millisecond cold starts and 100% Telegram API coverage, accepting strict pre-release verification gates.

## Context and Problem Statement
TGWrapper powers multiple production bots (`ratioAndScheduleBot`, `service-app`, `MyPersFinBot`, `create-ready-stack` templates). Heavy third-party bot libraries bloat serverless bundles and lag behind Telegram Bot API releases (Stars payments, Mini Apps `initData`, new message types).

## Decision Drivers
- Zero external runtime dependencies in `@tgwrapper/core` and strict bundle size budget (`pnpm pack:size`)
- Automated 100% parity with official Telegram Bot API schemas (`telegram:schema:release:gate`)
- Backwards-compatible public API surface across `.`, `./tma`, and `./payments` (`pnpm api:snapshot:check`) and TypeScript 6/7 compatibility (`pnpm typecheck:compat`)
- High-throughput update routing (`>=180,000 UPS` in `pnpm benchmark:trend:release`)

## Imperative Constraints for AI Agents (MUST / MUST NOT)
- **MUST:** Keep `@tgwrapper/core` `dependencies` empty (zero external runtime packages); adapter-specific drivers belong in separate workspace packages (e.g., `@tgwrapper/adapter-redis`).
- **MUST:** Regenerate and verify Telegram schema types, payloads, and results via `scripts/generate-telegram-schema-*.mjs` rather than hand-editing generated schema files.
- **MUST:** Preserve both ESM (`dist/`) and CommonJS (`dist-cjs/`) entrypoints and pass `pnpm api:snapshot:check` + `pnpm pack:size`.
- **MUST NOT:** Never log bot tokens (`bot<token>`) or bypass `crypto.timingSafeEqual` in `./tma` `InitData` signature verification.

## Considered Options & Rejected Alternatives
1. **Option 1 (Chosen): Zero-dependency core + schema codegen pipeline + API/size/benchmark gates**
   - *Why chosen:* Delivers >=180k updates/sec throughput, tiny bundle size for serverless edge workers, and deterministic schema coverage.
2. **Option 2 (Rejected — DO NOT PROPOSE): Wrapping `grammy` or `telegraf` as a runtime dependency**
   - *Why rejected:* Introduces transitive dependency bloat, slower cold starts, and breaks independent schema evolution.

## Consequences & Trade-offs
- **Positive:** Complete control over bundle size, throughput, and Telegram API baseline parity.
- **Negative / Cost:** Every public export or schema change must pass `pnpm verify:release:ci`.

## Verification Gate
- **Check Command:** `pnpm verify:release:ci`
- **Code Anchors:** `scripts/check-telegram-schema-release-gate.mjs`, `scripts/check-api-snapshot.mjs`, `scripts/check-package-size-budget.mjs`
