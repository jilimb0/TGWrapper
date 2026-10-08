# TGWrapper CI/CD, Workflows, and Pre-Commit Guide

> Status: Active working guide for contributors and maintainers.

## Purpose of this document

This document explains the current pipeline and workflow architecture in TGWrapper, why each part exists, how jobs are grouped, how release gates work, how failure reporting is aggregated, and how local developer checks should relate to CI. It is intended to be the single operational reference for understanding and maintaining the project’s automation layer.[cite:119][cite:101]

## Architecture overview

The automation model is split into a few layers rather than one giant workflow: regular CI validation, release-readiness validation, explicit go/no-go release gating, release execution, post-release smoke validation, Telegram API drift monitoring, and recurring reliability/baseline guards.[cite:119]

This separation is intentional. CI answers “is the branch healthy?”, release-readiness answers “are baseline release gates satisfied?”, go/no-go answers “should a tag or publish happen now?”, release performs the actual publish flow, and post-release smoke verifies what was published rather than what was merely built locally.[cite:119]

## Core design patterns

### 1. Small workflows with specific responsibilities

The repository uses multiple workflows with narrow purposes instead of one monolithic pipeline. This makes failures easier to classify and keeps expensive gates out of the hot path unless they are specifically requested or tied to release operations.[cite:119]

### 2. Concurrency by workflow intent

Each major workflow uses a dedicated concurrency key so redundant runs cancel each other when appropriate. This reduces wasted minutes and prevents older runs from racing newer ones on the same branch or PR.[cite:119]

### 3. Deterministic Node and pnpm setup

The workflows consistently use `pnpm/action-setup@v6`, `actions/setup-node@v6`, pinned pnpm `10.4.1`, and Node `20` or a `20/22` matrix where compatibility matters. This keeps CI behavior reproducible and makes matrix failures meaningful rather than environment-noise failures.[cite:119]

### 4. Explicit dependency installation inside each job

Jobs run `pnpm install --frozen-lockfile` inside the job itself rather than assuming previous state. This makes each job independently reproducible and avoids hidden coupling between workflow steps or jobs.[cite:119][cite:101]

### 5. Failure-digest aggregation

The project now uses a consistent pattern where important jobs write logs into `.artifacts`, build a compact `failure-summary.md` on failure, upload artifacts with `if: always()`, and let a final summary job aggregate those summaries into one view in `GITHUB_STEP_SUMMARY`.[cite:119]

This is the most important operator-experience pattern in the current setup, because it removes the need to open every failed job separately just to copy the first useful error line.[cite:119]

## CI workflow

### What CI is for

The `CI` workflow is the baseline branch and PR health signal. It runs on pushes to `main`, on pull requests, and on a weekly schedule.[cite:119]

### Jobs in CI

| Job | Purpose | Notes |
|---|---|---|
| `changeset-required` | Enforces changeset presence on PRs when needed | Pull-request only; uses full fetch depth for history-aware checks.[cite:119] |
| `verify` | Runs main validation path | Matrix on Node 20 and 22; includes type compatibility, typecheck, build, test.[cite:119] |
| `release-integrity` | Runs release-adjacent safety checks | Telegram baseline/schema checks, API snapshot check, package-size gate, recursive build.[cite:119][cite:101] |
| `redis-integration` | Tests redis-backed package integration | Starts Redis service and runs adapter integration tests.[cite:119] |
| `summary` | Aggregates results and failure digests | Always runs and produces the single-screen CI diagnosis view.[cite:119] |

### Why CI is split this way

The split keeps hot-path correctness checks separate from release-structure checks and from service-dependent integration checks. A failure in one area should be understandable as a class of failure, not just as “CI is red”.[cite:119]

### CI failure digest pattern

Each important CI job writes `.artifacts/error.log`, then on failure writes a markdown snippet with a short tail of the log. The final `summary` job downloads all `ci-*` artifacts, prints a job-result table, and appends every `failure-summary.md` file into one digest block.[cite:119]

Operationally, this means the first page a maintainer should inspect is the workflow summary, not the individual jobs.[cite:119]

## Release Readiness workflow

### What it is for

`Release Readiness` is a structured pre-release gate. It can run on push and PR, but its real value is as a consciously-invoked release-confidence workflow, especially when optional reliability gates are requested.[cite:119]

### Jobs in Release Readiness

| Job | Purpose | Notes |
|---|---|---|
| `verify` | Runs `pnpm verify:release` and publish dry-run | This is the baseline release-confidence path.[cite:119][cite:101] |
| `reliability` | Optional repeated load/chaos + integration | Only runs for manual dispatch when `include_reliability=true`.[cite:119] |
| `summary` | Produces GO/NO-GO readiness summary | Converts results into a human-readable release decision.[cite:119] |

### Why it exists separately from CI

CI should stay fast enough to be the normal branch health signal. Release-readiness is intentionally closer to a release operator checklist and can include heavier or more situational checks without making every PR more expensive.[cite:119]

### Readiness decision model

The summary job normalizes skipped reliability runs into `not_requested`, then emits a final readiness decision. The release baseline is considered satisfied when verify succeeds and reliability either succeeds or was not requested.[cite:119]

### Failure digest behavior

This workflow now follows the same artifact-and-summary model as CI, so a failed readiness run surfaces both the gate result and the compact reason in one summary screen.[cite:119]

## Go/No-Go workflow

### What it is for

`Go No-Go` is the explicit release decision workflow for tag-driven or manually-invoked release evaluation. It is stricter in intent than general readiness because it models the actual “publish or do not publish” question.[cite:119]

### Jobs in Go/No-Go

| Job | Purpose | Notes |
|---|---|---|
| `release-gates` | Verifies release path and dry-run publish | Also asserts supported npm publish mode assumptions.[cite:119] |
| `reliability-gates` | Runs repeated reliability checks and integration | Uses Redis service and repeated load/chaos passes.[cite:119] |
| `go-no-go-summary` | Emits final decision | Writes GO or NO-GO and now includes failure digest content.[cite:119] |

### Special pattern in this workflow

This workflow explicitly guards npm publish-mode assumptions before running the expensive release verification path. That is useful because it fails fast on configuration misuse rather than hiding the real issue later inside a dry-run publish step.[cite:119]

## Release workflow

### What it is for

The `Release` workflow is for performing the actual release operation, not merely validating it. Its role is to convert already-validated code into published package output and repository release state.[cite:119]

### Relationship to other workflows

The intended progression is:
1. CI validates normal branch health.
2. Release Readiness validates baseline release gates.
3. Go/No-Go answers whether publishing should proceed now.
4. Release performs publication.
5. Published Smoke verifies the published result.[cite:119]

This separation matters because “can build locally”, “can pass release gates”, and “was successfully published and consumable” are different states.[cite:119]

## Published Smoke workflow

### What it is for

`Published Smoke` validates published package behavior after release. It runs manually or after a successful `Release` workflow run on `main`.[cite:119]

### Why it exists separately

This workflow validates the post-publish world, which is materially different from validating the repository state before publish. Registry propagation, published package integrity, and strict smoke behavior belong after release, not before it.[cite:119]

### Failure behavior

This workflow now also writes a compact digest into the summary. Since it is a single-job workflow, the value here is less about multi-job aggregation and more about making the summary page immediately useful without opening raw logs.[cite:119]

## Telegram API watchdog and baseline workflows

### What they are for

The repository contains Telegram API monitoring and baseline-guard workflows so upstream API drift is treated as a first-class maintenance concern rather than an incidental bug source. The package scripts in `package.json` show this clearly through baseline checks, schema fetch, completeness, drift, generated types/payload/result checks, and follow-up guarding.[cite:101][cite:119]

### Important package-level scripts in this area

| Script | Purpose |
|---|---|
| `telegram:baseline:check` | Verifies committed Telegram API baseline state.[cite:101] |
| `telegram:baseline:latest` | Checks latest remote state without promoting it.[cite:101] |
| `telegram:baseline:sync` | Writes updated baseline when intentionally syncing.[cite:101] |
| `telegram:baseline:followup:check` | Guards that detected drift has corresponding follow-up work.[cite:101] |
| `telegram:schema:fetch:ci` | Fetches schema in CI with network-failure tolerance.[cite:101] |
| `telegram:schema:completeness:check` | Ensures schema coverage expectations are met.[cite:101] |
| `telegram:schema:drift:check` | Detects drift between latest and snapshot schema inputs.[cite:101] |
| `telegram:schema:types:check` | Validates generated type artifacts are current.[cite:101] |
| `telegram:schema:payloads:check` | Validates generated payload artifacts are current.[cite:101] |
| `telegram:schema:results:check` | Validates generated result artifacts are current.[cite:101] |
| `telegram:schema:release:gate` | Treats schema state as part of release safety.[cite:101] |

### Why this matters

This project treats Telegram API compatibility as an ongoing operational responsibility, not a one-time codegen task. That is why schema and baseline workflows are spread across CI, release integrity, watchdog, and follow-up guard patterns.[cite:101][cite:119]

## Nightly and reliability workflows

### What they are for

Nightly and repeated reliability workflows exist to catch classes of failure that are too expensive, too flaky in the short term, or too situational to run on every PR. Load, chaos, repeated-run stability, and watchdog-style drift checks belong here.[cite:119]

### Design principle

If a check is valuable but too heavy for the default contributor path, it should move into a scheduled/manual reliability lane rather than disappear entirely.[cite:119][cite:105]

## Package scripts as the real contract layer

### Why scripts matter more than YAML names

The workflows are orchestration. The real contract of the automation system lives in the package scripts and dedicated Node scripts. This is a good pattern because logic stays versioned and testable in repository code rather than being buried in long shell snippets inside YAML.[cite:101][cite:119]

### Important root scripts

| Script | Role |
|---|---|
| `build` | Root TypeScript build for ESM and CJS outputs.[cite:101] |
| `typecheck` | Root no-emit typecheck.[cite:101] |
| `typecheck:compat` | Compatibility-focused type testing path.[cite:101] |
| `test` | Main Vitest suite.[cite:101] |
| `test:integration` | Redis adapter integration route.[cite:101] |
| `test:load` | Load-focused reliability test.[cite:101] |
| `test:chaos` | Chaos/resilience validation.[cite:101] |
| `test:phase4` | Combined heavier reliability lane.[cite:101] |
| `pack:size` | Package size gate.[cite:101] |
| `api:snapshot:check` | Checks exported declaration snapshot against committed baseline.[cite:101] |
| `api:snapshot:update` | Updates committed API snapshot intentionally.[cite:101] |
| `verify:release` | Central release verification entrypoint.[cite:101] |
| `verify:release:ci` | Explicit CI-oriented release verification chain.[cite:101] |

## `verify:release` wrapper pattern

The repository now prefers a wrapper script `scripts/verify-release.mjs` exposed via `pnpm verify:release` instead of scattering the full release-verification sequence directly across many YAML files. That keeps orchestration cleaner and makes future sequence changes happen in one place.[cite:101][cite:119]

This is one of the healthiest patterns in the repo because release logic tends to drift when duplicated across workflows. Centralization keeps the workflows declarative and the logic auditable.[cite:101][cite:119]

## API snapshot pattern

### What it is for

The API snapshot check compares `dist/index.d.ts` with the committed snapshot under `docs/api-snapshots/tgwrapper-index.d.ts`. This protects the exported TypeScript surface from silent drift.[cite:100][cite:101]

### Important recent improvement

The check script now self-heals missing build output by generating `dist/index.d.ts` via `pnpm build:esm` when the declaration file is absent before comparison. That fixes the class of CI failures where the snapshot check ran before declaration output existed in the current job.[cite:100][cite:102]

### Why this pattern is good

It preserves the contract-checking role of API snapshots without coupling correctness to the exact order of previous job steps. A contract check should be strict about the contract, not fragile about incidental build ordering.[cite:100][cite:102]

## Failure-digest implementation pattern

### Standard recipe

The standard pattern now used in multiple workflows is:
1. `mkdir -p .artifacts`
2. run a meaningful grouped command with `set -euo pipefail`
3. pipe stderr/stdout to `tee .artifacts/error.log`
4. on failure, write a compact `failure-summary.md` using `tail -n N`
5. always upload `.artifacts`
6. aggregate those summaries in a final summary job when the workflow has multiple jobs.[cite:119]

### Why this is preferred

It is simple, shell-native, easy to replicate, and does not require external log APIs or custom parsers. It also scales naturally from a single-job workflow to a many-job workflow.[cite:119]

## Pre-commit and local developer gates

### What pre-commit should be for

Pre-commit checks should be fast, deterministic, and focused on rejecting obviously broken local changes before they enter CI. They should not try to reproduce every expensive release, integration, or reliability workflow locally.[cite:105][cite:119]

### Recommended local layering

A healthy local model for this repository is:

| Layer | Goal | Recommended commands |
|---|---|---|
| Pre-commit | Fast local rejection of obvious breakage | formatting/linting if present, targeted typecheck, maybe changed-file tests. |
| Pre-push or manual local verify | Strong confidence before pushing | `pnpm typecheck:compat && pnpm typecheck && pnpm build && pnpm test`.[cite:101] |
| Release-local manual gate | Release operator confidence | `pnpm verify:release`.[cite:101] |

### What should not go into pre-commit

Heavy matrix logic, repeated load/chaos loops, recursive publish dry-runs, scheduled watchdog behavior, and service-heavy integration checks should generally stay out of pre-commit. Otherwise local iteration becomes hostile and contributors learn to bypass hooks.[cite:105][cite:119]

### If a pre-commit hook is added or standardized

The best fit for this repository would be a minimal staged-file-oriented hook, for example:
- formatter or whitespace normalization if configured,
- lightweight lint if configured,
- possibly a focused TypeScript check only when root/package TS sources change.

The point of pre-commit is not to replace CI. It is to catch the cheap failures early and keep CI focused on the expensive, repository-wide truth.[cite:105][cite:119]

## How to think about workflow responsibility boundaries

### CI

Use CI to answer whether the codebase is healthy enough for normal integration.[cite:119]

### Release Readiness

Use Release Readiness to answer whether baseline release conditions are satisfied, optionally with heavier reliability evidence.[cite:119]

### Go/No-Go

Use Go/No-Go to answer whether a release should happen right now.[cite:119]

### Release

Use Release to execute publication after the earlier gates are already green.[cite:119]

### Published Smoke

Use Published Smoke to verify the outcome in the published environment after release.[cite:115][cite:119]

### Watchdogs and scheduled jobs

Use watchdog and nightly workflows to track drift, regression trends, and heavier checks that are not suitable for the main contributor path.[cite:119]

## Operational playbooks

### When a PR is red

1. Open the workflow summary first.[cite:119]
2. Read the failure digest section before opening any specific job.[cite:119]
3. If the digest is enough, fix directly from the summarized failing command.[cite:119]
4. Only open the raw job log if the digest is insufficient.[cite:119]

### When a release candidate is being prepared

1. Ensure CI is green.[cite:119]
2. Run or inspect Release Readiness.[cite:119]
3. If needed, include reliability gates for extra confidence.[cite:119]
4. Use Go/No-Go as the operator decision checkpoint.[cite:119]
5. Run Release only after that decision is positive.[cite:119]
6. Inspect Published Smoke after release succeeds.[cite:115][cite:119]

### When Telegram upstream changes are suspected

1. Start with baseline and schema-drift checks.[cite:101]
2. Use watchdog/follow-up guard flows to identify whether a change was detected but not yet operationalized.[cite:101][cite:119]
3. Regenerate or sync artifacts intentionally rather than patching generated files ad hoc.[cite:101]

## Maintenance recommendations

### Keep logic in scripts, not YAML

Whenever a command sequence starts being reused or gets conditional logic, move it into `scripts/*.mjs` and expose it through `package.json`. That is already the emerging style of this repository and it should be reinforced.[cite:101][cite:119]

### Keep summaries human-readable

The failure digest should stay short and biased toward the first useful diagnosis. Huge summaries become log dumps and lose the ergonomic advantage this pattern was added to achieve.[cite:119]

### Keep CI hot path lean

Expensive checks should be consciously placed in nightly, reliability, or release-focused workflows unless they are essential for every PR. This keeps contributor ergonomics acceptable without sacrificing confidence.[cite:105][cite:119]

### Keep release semantics explicit

Terms like “readiness”, “go/no-go”, “release”, and “published smoke” should remain semantically distinct in both workflow names and documentation. Those names encode operator intent and help keep the automation architecture understandable.[cite:111][cite:112][cite:115][cite:119]

## Suggested future improvements

- Add this document to the main documentation index so maintainers can find it quickly.[cite:119]
- If a formal pre-commit setup is introduced, document its exact commands here and keep it intentionally lightweight.[cite:105][cite:119]
- Consider reusing one shared shell helper for failure-digest generation if duplication across workflows grows too much.[cite:119]
- Consider a dedicated “operator runbook” companion doc for actual release-day steps once the release flow stabilizes further.[cite:119]
