# Release Checklist 0.5.0

Use this checklist before creating `v0.5.0-rc.*` and `v0.5.0`.

## Required GitHub checks for `main`

Configure branch protection to require:

- `CI / verify`
- `CI / redis-integration`
- `Publish Dry Run / publish-dry-run`
- `Release Readiness / verify`
- `Release Readiness / summary`

Optional for daily PR flow (recommended required for release PRs):

- `Go No-Go / release-gates`
- `Go No-Go / reliability-gates`
- `Go No-Go / go-no-go-summary`

## RC verification flow

1. Create and push RC tag:
   - `git tag v0.5.0-rc.1`
   - `git push origin v0.5.0-rc.1`
2. Confirm `Go No-Go` workflow is green with `Decision: GO`.
3. Confirm `Nightly Phase4` has at least one green run after RC tag date.

## Final release flow

1. Ensure latest `main` commit still has all required checks green.
2. Create final tag:
   - `git tag v0.5.0`
   - `git push origin v0.5.0`
3. Run `Release` workflow (if not auto-triggered by policy) and verify publish steps.

## No-Go criteria

Do not cut `v0.5.0` if any of the following fails:

- API snapshot check
- publish dry-run
- go/no-go summary decision
- nightly reliability gate (post-RC)
