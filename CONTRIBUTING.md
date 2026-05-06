# Contributing to TGWrapper

Thanks for contributing to TGWrapper.

## Development setup

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

## Pull requests

- Create a feature branch from `main`.
- Keep PRs focused and small.
- Add or update tests for behavior changes.
- Add a Changeset in `.changeset/` for user-facing package changes.
- Link the related issue in the PR description.

## Quality gates

Before requesting review, run:

```bash
pnpm verify:release
```

If your change touches Telegram API baseline or compatibility surface, also ensure:

- `src/types/telegram.ts` is updated as needed
- compatibility tests are updated:
  - `test/types/telegram-api-compat.typecheck.ts`
  - `test/telegram-api-compat.contract.test.ts`
  - `test/context.compat.test.ts`
  - `test/runtime.fallbacks.test.ts`
- `docs/TELEGRAM_API_COMPATIBILITY.md` reflects the change

## Commit style

Use clear, imperative commit messages, for example:

- `fix: handle purchased_paid_media fromId fallback`
- `feat: cache sorted router routes`
- `docs: clarify production rate limiter recommendation`

## Code style

- TypeScript strictness and existing patterns should be preserved.
- Prefer explicit typing on public APIs.
- Avoid breaking changes without a migration note.

## Reporting bugs

Please include:

- TGWrapper package version(s)
- Node.js version
- minimal reproduction
- expected vs actual behavior

## Security

Please do not disclose vulnerabilities publicly. See `SECURITY.md` for coordinated disclosure.
