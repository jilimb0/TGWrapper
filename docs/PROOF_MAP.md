# TGWrapper Proof Map

This map links major public claims to evidence, limitations, and reproduction steps.

| Claim Area | Evidence Source | Reproduction Path | Environment | Limitations |
| --- | --- | --- | --- | --- |
| Core tests and router/FSM behavior | Vitest suite | `pnpm test` | Node.js CI/runtime | Does not validate Telegram network behavior. |
| Type compatibility | TypeScript compatibility project | `pnpm typecheck:compat` | Node.js + TypeScript | Only covers encoded type cases and public API usage examples. |
| Package buildability | Workspace build | `pnpm -r build` | Node.js 22 in CI | Does not prove runtime deployment on every platform. |
| API snapshot stability | API snapshot docs | `pnpm api:snapshot:check` | Local/CI | Snapshot detects public type drift, not semantic regressions. |
| Core benchmark profile | Benchmark scripts | `pnpm benchmark` and `pnpm benchmark:trend` | Current CI/local benchmark host | Synthetic processing benchmark; excludes Telegram API, Redis, external handlers, observability exporters, and network. |
| Package size budgets | Pack size script | `pnpm pack:size` | npm pack dry-run | Applies to runtime libraries; starter/scaffolder packages are checked separately. |
| Starter package contents | Starter pack checker | `pnpm pack:starters` | Local/CI | Validates metadata, tarball contents, and scaffold smoke without real npm registry install. |
| Published package runtime smoke | Published smoke workflow | `node scripts/published-smoke.mjs` | Clean temporary npm project | Requires packages to be live on npm and registry access. |
| Redis CAS semantics | Redis integration tests and chaos tests | `pnpm --filter @tgwrapper/adapter-redis test:integration`, `pnpm test:chaos` | Redis service, Node.js | Conflicts return `ok: false`; caller must implement retry/conflict behavior. |
| Redis rate limiter atomicity | Redis integration tests | `pnpm --filter @tgwrapper/adapter-redis test:integration` | Redis service, Node.js | Clock drift and Redis availability remain operational responsibilities. |
| Telegram API schema drift | Baseline/schema scripts | `pnpm telegram:baseline:check`, `pnpm telegram:schema:types:check`, `pnpm telegram:schema:payloads:check`, `pnpm telegram:schema:results:check` | CI, optional network fetch | Fetch step can be skipped/softened on network failure; generated coverage is only as good as source schema. |
| Release publish readiness | Release workflows | `pnpm verify:release`, `pnpm -r publish --dry-run --no-git-checks` | GitHub Actions release jobs | Dry-run does not guarantee npm registry acceptance or organization permission state. |
| Runtime portability | Compatibility matrix and examples | Build/run relevant examples, `pnpm pack:starters` for scaffolds | Node.js, AWS Lambda, Cloudflare Workers examples | Capability support differs by package; do not collapse core portability, Redis TCP behavior, and observability context propagation into one claim. |

## Reviewer Path

For a strong public claim, reviewers should be able to answer:

1. Which package owns the claim?
2. Which script or workflow proves it?
3. Which runtime was used?
4. What is excluded?
5. What wording appears in public docs?

If any answer is missing, the claim must be downgraded or removed.

