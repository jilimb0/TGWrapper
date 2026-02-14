# Release Policy

## Source of Truth

- Versioning is managed by Changesets in `.changeset/`.
- Publishing is CI-only through `/Users/jilimbo/Documents/Personal/TGWrapper/.github/workflows/release.yml`.
- Manual local `pnpm publish` is blocked by `prepublishOnly` checks.

## Supported npm Publish Modes

| Repository Visibility | npm Provenance | Status | Notes |
|---|---|---|---|
| private | enabled | unsupported | npm rejects trusted publish provenance bundle for private source repository visibility in our current setup. |
| private | disabled | supported (current) | **Current 0.5.0 policy**. Release workflow enforces this mode and fails fast on unsupported config. |
| public | enabled | supported | Can be enabled after repository/package policy migration. |

## 0.5.0 Policy Decision

- Keep repository private.
- Publish with OIDC trusted publishing and **provenance disabled**.
- Fail fast if `NPM_PUBLISH_PROVENANCE=true` is configured.

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
2. Open PR; CI runs tests, typecheck, build, API snapshot check, and publish dry-run.
3. Merge to `main`.
4. Release workflow runs `changesets/action` to version + publish.

## Safety Gates

- CI must be green before release.
- Publish dry-run workflow must pass.
- OIDC preflight in Release workflow must pass for unpublished package versions.
- Release job must pass publish-mode assertion for repository visibility/provenance policy.

## npm OIDC Setup

1. Open each package page in npm:
   - `@jilimb0/tgwrapper`
   - `@jilimb0/tgwrapper-adapter-redis`
   - `@jilimb0/tgwrapper-observability`
2. In package settings, add a Trusted Publisher:
   - Provider: GitHub Actions
   - Repository: `jilimb0/TGWrapper`
   - Workflow: `Release`
3. Save and run the `Release` workflow again.
