# Release Policy

## Source of Truth

- Versioning is managed by Changesets in `.changeset/`.
- Publishing is CI-only through `/Users/jilimbo/Documents/Personal/TGWrapper/.github/workflows/release.yml`.
- Manual local `pnpm publish` is blocked by `prepublishOnly` checks.
- Telegram Bot API target baseline is tracked in `/Users/jilimbo/Documents/Personal/TGWrapper/docs/telegram-api-baseline.json` and validated by `pnpm telegram:baseline:check`.
- Telegram API schema snapshot is tracked in `/Users/jilimbo/Documents/Personal/TGWrapper/docs/telegram-api-schema.snapshot.json` and compared via `pnpm telegram:schema:drift:report`.

## Supported npm Publish Modes

| Repository Visibility | npm Provenance | Status | Notes |
|---|---|---|---|
| private | enabled | unsupported | npm rejects trusted publish provenance bundle for private source repository visibility in our current setup. |
| private | disabled | supported (current) | Current policy. Release workflow enforces this mode and fails fast on unsupported config. |
| public | enabled | supported | Can be enabled after repository/package policy migration. |

## SemVer Rules

- `patch`: bug fixes only, no API breaks.
- `minor`: additive backward-compatible APIs.
- `major`: any API/runtime behavior break.

## Package Scope

- `@tgwrapper/core`: runtime/kernel/router/FSM contracts.
- `@tgwrapper/adapter-redis`: Redis session adapter and storage guarantees.
- `@tgwrapper/observability`: logging/metrics utilities.

## Release Flow

1. Add real changeset with package bump level.
2. Open PR; CI + readiness gates must pass.
3. Merge to `main`.
4. Release workflow runs version + publish.

## Tag Guardrails

- Tags/releases only for real changesets with code/docs impact.
- Empty changesets are not allowed for release tagging.
- Enforced by `pnpm changeset:lint`.

## Published Smoke Modes

- Auto run after `Release` workflow: informational mode (`PUBLISHED_SMOKE_STRICT=false`).
- Manual run (`workflow_dispatch`): strict mode (`PUBLISHED_SMOKE_STRICT=true`).

## Safety Gates

- `pnpm verify:release` must pass.
- OIDC preflight and publish mode assertion must pass.
- Schema drift gate must pass or be accompanied by required follow-up changeset.

## npm OIDC Setup

1. Open each package page in npm:
   - `@tgwrapper/core`
   - `@tgwrapper/adapter-redis`
   - `@tgwrapper/observability`
2. In package settings, add a Trusted Publisher:
   - Provider: GitHub Actions
   - Repository: `jilimb0/TGWrapper`
   - Workflow: `Release`
3. Save and run the `Release` workflow again.
