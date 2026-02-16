# Release Checklist 1.0.0

## Local Preflight

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm verify:1.0`
- [ ] `pnpm -r publish --dry-run --no-git-checks`

## DoD (Formal 100%)

- [ ] DoD file reviewed: `/Users/jilimbo/Documents/Personal/TGWrapper/docs/DEFINITION_OF_DONE_1.0.0.md`
- [ ] Full schema coverage check passed (`telegram:schema:coverage:full:check`)
- [ ] No known P0/P1 defects in release scope

## CI Readiness

- [ ] `CI` workflow green
- [ ] `Release Readiness` workflow green with reliability gates
- [ ] `Go No-Go` workflow green
- [ ] `Baseline Follow-up Guard` green

## Changeset + Versioning

- [ ] Non-empty changeset for `@jilimb0/tgwrapper` prepared
- [ ] Version bump target is `1.0.0`
- [ ] PR includes release notes summary

## Publish

- [ ] Merge to `main`
- [ ] Run `Release` workflow
- [ ] Confirm npm versions available

## Post-Publish

- [ ] Run strict published smoke manually
- [ ] Create release notes and changelog entry
- [ ] Announce stable `1.0.0` SemVer policy
