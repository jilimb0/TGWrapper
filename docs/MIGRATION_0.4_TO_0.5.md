# Migration Notes: 0.4.0 -> 0.5.0

## Behavioral/operational changes

- Release policy now explicitly supports private-repo OIDC publish **without provenance**.
- Release workflow fails fast when unsupported provenance mode is requested.
- CI includes API snapshot guard for root public contract (`dist/index.d.ts`).
- Chaos/load validation includes explicit thresholds instead of smoke-only assertions.
- Nightly workflow repeats chaos/load scenarios to catch flaky regressions.

## What to verify after upgrade

- Your release process does not force npm provenance in private repository mode.
- Any intentional API export change updates the snapshot baseline via `pnpm api:snapshot:update`.
- Observability dashboards include all metrics from `OBSERVABILITY_CONTRACT.md`.
- Runtime saturation alarms are configured for queue overflow and rate-limited drops.

## No intended breaking API changes

`0.5.0` does not intentionally introduce breaking API changes compared with `0.4.0`.
Potentially evolving areas are marked as experimental in `API_STABILITY_0.5.md`.
