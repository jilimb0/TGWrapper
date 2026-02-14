# Release Policy

## Source of Truth

- Versioning is managed by Changesets in `.changeset/`.
- Publishing is CI-only through `.github/workflows/release.yml`.
- Publishing uses npm Trusted Publishing (OIDC) from GitHub Actions.
- Manual local `pnpm publish` is blocked by `prepublishOnly` checks.

## SemVer Rules

- `patch`: bug fixes, internal refactors, non-breaking docs/tooling.
- `minor`: additive APIs, new adapters/features that are backward compatible.
- `major`: breaking API or behavior changes.

## Package Scope

- `@jilimb0/tgwrapper`: runtime/kernel/router/FSM contracts.
- `@jilimb0/tgwrapper-adapter-redis`: Redis session adapter and storage guarantees.
- `@jilimb0/tgwrapper-observability`: logging/metrics utilities.

## Release Flow

1. Create/update Changeset file with package bump levels.
2. Open PR; CI runs tests, typecheck, and publish dry-run.
3. Merge to `main`.
4. Release workflow runs `changesets/action` to version + publish.

## Safety Gates

- CI must be green before release.
- `publish dry-run` workflow must pass.
- npm package must have Trusted Publisher configured for this repository/workflow.

## npm OIDC Setup

1. Open each package page in npm:
   - `@jilimb0/tgwrapper`
   - `@jilimb0/tgwrapper-adapter-redis`
   - `@jilimb0/tgwrapper-observability`
2. In package settings, add a Trusted Publisher:
   - Provider: GitHub Actions
   - Repository: `jilimb0/TGWrapper`
   - Workflow: `Release`
   - Environment (if used): match the workflow configuration
3. Save and run the `Release` workflow again.
