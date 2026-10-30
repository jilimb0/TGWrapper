# Common Development Tasks: TGWrapper

## 1. Standard Commands
- **Run unit tests:** `pnpm test` — Runs the Vitest unit test suite.
- **Typecheck (TS 7 + TS 6 compat):** `pnpm typecheck` and `pnpm typecheck:compat`.
- **Lint source:** `pnpm lint` — Validates code quality with Biome.
- **Build ESM + CJS:** `pnpm build` — Compiles `dist/` and `dist-cjs/`.
- **Full release verification:** `pnpm verify:release:ci` — Runs schema checks, tests, compat typecheck, snapshot check, and size budget.

## 2. Recipe: Updating Telegram Bot API Schema
1. Run `pnpm telegram:schema:types:generate`, `pnpm telegram:schema:payloads:generate`, and `pnpm telegram:schema:results:generate`.
2. Verify zero drift with `pnpm telegram:schema:release:gate`.
3. Update API snapshot if intentional via `pnpm api:snapshot:update`.
4. Run `pnpm verify:release:ci`.
