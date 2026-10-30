# Engineering Conventions: TGWrapper

## 1. Code Standards & TypeScript
- Strict TypeScript across both current TypeScript 7 and `typescript-compat` (TS 6): no `any`, explicit public return types, `sideEffects: false`.
- Dual ESM (`dist/`) and CommonJS (`dist-cjs/`) compilation must succeed without warnings.
- Format and lint enforced via Biome (`pnpm lint`).

## 2. Error Handling & Resilience
- Outbound Telegram API requests must respect `429 Too Many Requests` (`parameters.retry_after`) and apply exponential backoff with Full Jitter.
- Multi-tenant and Redis state adapters must isolate session keys by bot/tenant prefix and survive chaos tests (`pnpm test:chaos`).

## 3. Logging & Privacy Baseline
- Never log raw Telegram bot tokens (`bot<token>`) or unredacted user messages in error traces.
- Validate Telegram Mini App `initData` using `crypto.timingSafeEqual`.

## 4. Testing & Release Gates
- TDD-first with Vitest (`pnpm test`, `pnpm test:load`, `pnpm test:chaos`).
- Never modify public API exports or Telegram schema types without passing `pnpm api:snapshot:check` and `pnpm telegram:schema:release:gate`.
