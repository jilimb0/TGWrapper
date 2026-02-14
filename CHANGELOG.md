# @jilimb0/tgwrapper

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
