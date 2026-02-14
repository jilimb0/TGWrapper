# Release Checklist 0.5.2

## Preconditions

- `main` is green on required checks.
- Changeset exists for `@jilimb0/tgwrapper` patch bump.
- `Release` workflow includes benchmark trend gate.

## Required checks

- `CI / verify`
- `CI / redis-integration`
- `Publish Dry Run / publish-dry-run`
- `Release Readiness / verify`
- `Release Readiness / summary`
- `Go No-Go / go-no-go-summary`

## Final release flow

1. Create and push `v0.5.2-rc.1`.
2. Ensure `Go No-Go` returns `GO`.
3. Ensure at least one green `Nightly Phase4` run after RC tag.
4. Create and push final tag `v0.5.2`.
5. Validate `Release` and `Published Smoke`.

## Post-release checks

- `npm view @jilimb0/tgwrapper version` returns `0.5.2`.
- Benchmark trend gate remains >= configured threshold.
- No increase in overflow/conflict incidents.
