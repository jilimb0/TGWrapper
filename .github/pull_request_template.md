## Summary

- What changed and why
- Related issue/ticket

## Release Checklist

- [ ] Added/updated a Changeset file in `.changeset/`
- [ ] `pnpm install --frozen-lockfile` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm -r typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] `pnpm -r build` passes
- [ ] `pnpm -r publish --dry-run --no-git-checks` passes locally or via CI `Publish Dry Run`
- [ ] If Redis adapter changed: `REDIS_URL=redis://127.0.0.1:6379 pnpm test:integration` passes
- [ ] Migration docs updated when API behavior changes (`docs/MIGRATION_FROM_TELEGRAF.md` / `docs/MIGRATION_COOKBOOK.md`)

## Breaking Changes

- [ ] None
- [ ] Present (describe below)

## Verification Notes

- Commands run:
  - `pnpm -r typecheck`
  - `pnpm test`
  - `pnpm build`
  - `pnpm -r publish --dry-run --no-git-checks`
- Additional logs/screenshots if needed
