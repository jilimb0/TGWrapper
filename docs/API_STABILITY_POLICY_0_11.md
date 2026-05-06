# API Stability Policy for 0.11.0

This document defines the stable API surface and compatibility guarantees for the `0.11.x` line.

## Stable Public Surface

The following APIs are considered stable for `0.11.x` and only receive backward-compatible changes inside the minor line:

- `createBotClient`
- `ApiClient`
- `Context`
- `SessionManager`
- `TreeRouter`
- `BotRuntime`
- public adapters exported from package entrypoints
- documented Telegram type contracts used by public APIs

## Internal and Experimental Surface

Anything not explicitly documented as public in package entrypoints and top-level docs should be treated as internal and may change without notice in `0.x` releases.

Experimental patterns should be documented as such in docs/examples and are not covered by strict compatibility guarantees.

## Telegram API Compatibility Promise

- Target Telegram Bot API baseline is tracked in `docs/telegram-api-baseline.json`.
- Compatibility validation is enforced by:
  - `pnpm telegram:baseline:check`
  - `pnpm telegram:schema:types:check`
  - `pnpm telegram:schema:payloads:check`
  - `pnpm telegram:schema:results:check`
  - contract and context compatibility tests in `test/`

When Telegram baseline updates are detected, release follow-up must include updates to types, compatibility tests, runtime fallbacks, and docs before publishing compatibility claims.

## SemVer Policy for 0.11.x

Because this is still `0.x`, we apply a conservative stability model:

- `patch`: bug fixes, docs updates, security fixes, non-breaking compatibility improvements
- `minor`: additive API updates or behavior additions that preserve existing usage
- breaking changes should be avoided in `0.11.x`; if unavoidable, they require explicit migration notes and release-callout

## Release Gates

`0.11.x` releases must pass:

- `pnpm verify:release`
- configured required PR checks
- security/code scanning gates according to repository policy

## Change Management

Any user-facing change in the stable surface requires:

- a changeset
- updated tests where behavior changes
- docs update if API behavior or usage expectations changed
