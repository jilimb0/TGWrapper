# TGWrapper 1.0.0 Release Plan

## Goal

Ship `1.0.0` as the first stable production release with strict SemVer and formalized compatibility guarantees.

## Formal 100% Definition

For this project, "100% for 1.0.0" means **100% at release-time baseline**, defined in:

- `/Users/jilimbo/Documents/Personal/TGWrapper/docs/DEFINITION_OF_DONE_1.0.0.md`

Release is blocked unless all DoD checks pass.

## Stable Contract for 1.0.0

- Public API surface: `/Users/jilimbo/Documents/Personal/TGWrapper/src/index.ts`
- Contract snapshot: `/Users/jilimbo/Documents/Personal/TGWrapper/docs/api-snapshots/tgwrapper-index.d.ts`
- Any change in public declarations requires explicit SemVer decision.

## Hard Gates for 1.0.0

1. `pnpm verify:1.0`
2. `pnpm -r publish --dry-run --no-git-checks`
3. Redis integration and repeated reliability checks (load + chaos)
4. Schema drift guard (`telegram-api-doc` source) must pass or have explicit follow-up

## 1.0 Readiness Checklist

- [x] Telegram target baseline fixed at `Bot API 9.4`
- [x] Schema parser stable with fallback extraction
- [x] Schema-derived methods/update keys generation
- [x] Schema-derived payload types generation
- [x] Schema-derived result types generation
- [x] Strict full-coverage gate (`snapshot == generated maps/unions`)
- [x] Type-level compatibility tests for key 9.x fields
- [x] Runtime fallback tests for new update types
- [x] API snapshot guard
- [x] Package size guard
- [x] Benchmark trend guard
- [x] Baseline follow-up guard for PRs
- [x] Watchdog automation (baseline + PR/issue flow)

## Release Sequence to 1.0.0

1. Run `pnpm verify:1.0` locally
2. Run `Release Readiness` workflow with reliability gates enabled
3. Merge only changeset-backed PRs
4. Create `1.0.0` changeset
5. Merge to `main` and execute `Release` workflow
6. Verify npm published versions and run strict published smoke

## Post-1.0 Maintenance Mode

- Primary track: Telegram Bot API updates
- Secondary track: reliability/perf hardening without breakage
- Breaking changes only for `2.0.0`
