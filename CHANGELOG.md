# @tgwrapper/core

## 0.16.3

### Patch Changes

- fd432ba: Enhance docs, refactor

## 0.16.2

### Patch Changes

- 8922ff7: ver upgrade

## 0.16.1

### Patch Changes

- 20d6e70: Upgrade

## 0.16.1

### Patch Changes

- 8fc3cfe: Upgrade packages product readiness

## 0.16.1

### Patch Changes

- f9f6702: add platform trust and incident guidance

## 0.16.1

### Patch Changes

- 8a28888: Starter packages
- 5ff96a7: add platform trust and incident guidance

## 0.16.0

### Minor Changes

- 19a0fe3: Migration, upgrade, improvements
- 19a0fe3: Migration, upgrade, improvement

## 0.15.0

### Minor Changes

- 406e9bc: Platform ready upgrade

## 0.14.1

### Patch Changes

- ac73c0d: Enhance documentation and add new validation and hardening resources

## 0.14.0

### Minor Changes

- c97e4f5: Project upgrade

## 0.13.1

### Patch Changes

- c10bde0: Improvements after audit

## 0.13.0

### Minor Changes

- 52edf00: Product ready improvements

## 0.12.0

### Minor Changes

- 497805e: Update to 10.0 Telegram Bot API

## 0.11.0

### Minor Changes

- f60b373: Improve production readiness with CI/security hardening, TypeScript 6 compatibility updates, and dependency safety fixes (including Vite patch-level security update).

## 0.10.3

### Patch Changes

- b9de156: Improve production readiness with CI/security hardening, TypeScript 6 compatibility updates, and dependency safety fixes (including Vite patch-level security update).

## 0.10.2

### Patch Changes

- f29938e: Improve TypeScript 6 compatibility in CI/build pipelines and refresh release, security, and onboarding documentation.

## 0.10.1

### Patch Changes

- 3b40fad: Add telegram/schema compatibility follow-up for detected schema drift and release-gate tracking.

## 0.10.0

### Minor Changes

- 7f3f437: Release preparation for the next feature line with production-oriented DX improvements.

  Core (`@tgwrapper/core`):

  - add dual ESM/CJS package exports
  - add `createBotClient` facade with lifecycle and event API
  - expand typed high-level Telegram methods and bot-oriented exported types
  - extend testkit with `MockBotClient`

  Redis adapter (`@tgwrapper/adapter-redis`):

  - add `RedisCacheStore` for JSON cache operations and namespace utilities
  - add distributed rate limiter (`createRateLimiter`) with sliding window and block support
  - add namespace factories for app-layer usage

  Observability (`@tgwrapper/observability`):

  - add `attachBotObservability` helper
  - stabilize metrics snapshot schema with timestamp
  - document stable utility APIs and redaction guidance

  Docs:

  - refresh bot development, migration, production checklist, and observability docs in English

## 0.9.0

### Minor Changes

- Add production-ready developer APIs and tooling for building complex bots:

  - core: high-level API methods (`sendDocument`, `getFileLink`, `editMessage*`), runtime lifecycle (`start/stop/onError`), runtime and API hooks, and official testkit exports
  - adapter-redis: generic KV API with namespace/prefix utilities and atomic index helpers
  - observability: async/timer helpers, runtime observability binding, and standardized metrics snapshots

  This release improves day-1 and day-2 usability while keeping backward compatibility for existing integrations.

## 0.8.0

### Minor Changes

- Consolidate and modernize documentation in English, add a complete bot development guide, and introduce stricter release/readiness guardrails.

  ### Highlights

  - Add `docs/BOT_DEVELOPMENT_GUIDE.md` with end-to-end setup for polling and webhook bots.
  - Add `docs/DOCUMENTATION.md` as a single docs entrypoint.
  - Formalize release quality criteria with `DEFINITION_OF_DONE_1.0.0.md`.
  - Add strict schema full-coverage check and wire it into `verify:1.0`.
  - Update release workflows (`release-readiness`, `go-no-go`) for stronger pre-release confidence.
  - Remove obsolete 0.5.x documentation and legacy tracking files.
  - Align example package dependencies with current framework version.

## 0.7.0

### Minor Changes

- ceb8926: Finalize Telegram Bot API schema compatibility pipeline for 0.6.x:

  - harden Telegram docs parser to extract stable method/update schema from `core.telegram.org`
  - generate and lock schema-derived method/update unions in TypeScript types
  - enforce schema completeness gate in release checks (remote source + min method/update counts)
  - improve parser test coverage for heading/table/dl layout variations

  This release improves API surface reliability and upgrade safety without introducing breaking changes.

## 0.6.0

### Minor Changes

- 9de9fd0: Replace `@grammyjs/types` with internal Telegram type definitions, add Telegram API baseline sync checks, and expand runtime/context compatibility fallbacks for newer update scenarios.

## 0.5.2

### Patch Changes

- 37867ca: Strengthen 0.5.2 release reliability by:

  - running benchmark trend gates in release and publish dry-run workflows
  - standardizing publish dry-run on `verify:release`
  - adding a dedicated 0.5.2 release checklist

## 0.5.1

### Patch Changes

- 1ff28e6: Harden next release cycle quality gates by adding:

  - adapter contract tests for cross-platform webhook behavior consistency
  - package size budget checks in CI and release verification
  - benchmark trend regression check against repository baseline
  - reliability-aware release-readiness and go/no-go workflow gates

## 0.5.1 (Unreleased)

### Patch Changes

- add cross-platform adapter contract tests for webhook semantics
- enforce package size budgets in local/CI release verification
- enforce benchmark trend regression gate against repository baseline
- strengthen release-readiness and go/no-go workflows with benchmark checks

## 0.5.0

### Minor Changes

- 64fc2b5: Prepare 0.5.0 release hardening with:

  - frozen API surface guard in CI via `dist/index.d.ts` snapshot checks
  - release readiness and go/no-go workflows for automated gating
  - threshold-based reliability checks for load/chaos paths with repeated nightly runs
  - observability contract, production checklist, and 0.4 -> 0.5 migration documentation
  - release policy fail-fast for unsupported provenance mode on private repository

## 0.4.0

### Minor Changes

- 8fa2952: Phase 3 release foundation.

  - add workspace package architecture and release automation baseline
  - add production Redis adapter package with atomic CAS semantics
  - add observability package and ECS-compatible logging primitives
  - add runtime tenant guards (rate limiting and bounded concurrency)
  - add webhook E2E harness and platform examples (Node, AWS Lambda, Cloudflare)
