# Release Checklist 0.5.1

## Preconditions

- `main` is green on required checks.
- Changeset exists for `@jilimb0/tgwrapper` patch bump.
- Release notes/changelog include 0.5.1 updates.

## Required checks

- `CI / verify`
- `CI / redis-integration`
- `Publish Dry Run / publish-dry-run`
- `Release Readiness / verify`
- `Release Readiness / summary`
- `Go No-Go / go-no-go-summary`

## RC flow (recommended)

1. Create RC tag:
   - `git tag v0.5.1-rc.1`
   - `git push origin v0.5.1-rc.1`
2. Ensure `Go No-Go` decision is `GO`.
3. Ensure `Nightly Phase4` has at least one green run after RC creation.

## Final release flow

1. Create final tag:
   - `git tag v0.5.1`
   - `git push origin v0.5.1`
2. Validate `Release` workflow publish step.
3. Validate `Published Smoke` workflow.

## Post-release checks

- `npm view @jilimb0/tgwrapper version` returns `0.5.1`.
- Benchmark trend still within threshold.
- No increase in queue overflow/session conflict alerts.
