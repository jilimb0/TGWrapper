# Release Checklist 0.11.0

## Code and Quality
- [ ] `pnpm verify:release` passes on `main`.
- [ ] Required checks are green on PR merge path.
- [ ] No unresolved high-severity owned-code alerts in CodeQL/Dependabot.

## Compatibility
- [ ] Telegram baseline checks pass.
- [ ] Compatibility tests updated for baseline changes.
- [ ] API stability policy for `0.11.x` is published.

## Documentation and DX
- [ ] README quickstart paths validated.
- [ ] Canonical starters run from clean clone.
- [ ] Migration guides are discoverable from docs index.

## Release Artifacts
- [ ] Changeset merged for user-facing changes.
- [ ] `changesets/action` generated version bump PR.
- [ ] Release notes finalized from `docs/RELEASE_NOTES_0_11_0_DRAFT.md`.
