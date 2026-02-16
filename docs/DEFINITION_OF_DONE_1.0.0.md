# Definition of Done: 1.0.0

## Why this exists

"Absolute 100% forever" is not technically possible for a live external API that can change after release.
For `1.0.0`, we define **formal 100% readiness at release time**.

## Formal 100% for 1.0.0

`1.0.0` is considered "100% ready" only if all criteria below are true:

1. `pnpm verify:1.0` passes.
2. Snapshot coverage is exact (`1:1`) for current baseline:
   - snapshot methods == generated method union
   - snapshot methods == payload map keys
   - snapshot methods == result map keys
   - snapshot update keys == generated update union
3. No open known P0/P1 defects in release scope.
4. Release workflows pass (`Release Readiness`, `Go No-Go`).
5. Publish dry-run passes for all packages.

## Guaranteed by 1.0.0

- Stable SemVer contract for public exports in `src/index.ts`.
- Reproducible release gates in CI.
- Formal compatibility target pinned to Telegram Bot API baseline (`9.4`).

## Not guaranteed

- Future Telegram API additions after `1.0.0` release date.

## Post-release SLA

- On new Telegram Bot API release detection:
  - open follow-up issue/PR via watchdog,
  - update snapshot/types/runtime coverage,
  - publish compatible update release.
