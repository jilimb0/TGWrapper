# @jilimb0/tgwrapper

## 0.5.0

### Minor Changes

- 64fc2b5: Prepare 0.5.0 release hardening with:

  - frozen API surface guard in CI via `dist/index.d.ts` snapshot checks
  - release readiness and go/no-go workflows for automated gating
  - threshold-based reliability checks for load/chaos paths with repeated nightly runs
  - observability contract, production checklist, and 0.4 -> 0.5 migration documentation
  - release policy fail-fast for unsupported provenance mode on private repository

## 0.5.0 (Unreleased)

### Stability guarantees added

- Freeze public API surface for `0.5.x` with CI snapshot guard (`dist/index.d.ts`).
- Enforce release policy for private repository trusted publishing without provenance.
- Harden chaos/load tests with threshold-based assertions and nightly repeated runs.
- Define explicit observability contract and production checklist documentation.

### Deferred to 1.0.0

- Strict semver backward-compatibility guarantee lifecycle.
- Pluggable observability backends (Prometheus/OpenTelemetry adapters).
- Formal multi-tenant fairness guarantees under noisy-neighbor load.

## 0.4.0

### Minor Changes

- 8fa2952: Phase 3 release foundation.

  - add workspace package architecture and release automation baseline
  - add production Redis adapter package with atomic CAS semantics
  - add observability package and ECS-compatible logging primitives
  - add runtime tenant guards (rate limiting and bounded concurrency)
  - add webhook E2E harness and platform examples (Node, AWS Lambda, Cloudflare)
