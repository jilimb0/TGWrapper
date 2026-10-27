# Common Development Tasks: TGWrapper

## 1. Standard Commands
- **Typecheck:** `pnpm typecheck` — Validates TypeScript typings and compatibility.
- **Run tests:** `pnpm test` — Executes unit, resilience, and mock API tests.
- **Lint code:** `pnpm lint` — Runs Biome linter.
- **Build library:** `pnpm build` — Generates ESM and CJS distributions.

## 2. Recipe: Adding a New Feature
1. Review requirements against invariants in `.ai/ARCHITECTURE.md`.
2. Write a failing test in test directory verifying expected behavior.
3. Implement minimal clean code to satisfy the test.
4. Run `pnpm test` and `pnpm lint`.
5. Run `pnpm build` to ensure code style compliance.

## 3. Recipe: Fixing a Bug
1. Reproduce defect with an automated regression test.
2. Verify test failure matches reported symptoms.
3. Apply targeted fix without modifying unrelated code.
4. Verify all tests pass with `pnpm lint`.
