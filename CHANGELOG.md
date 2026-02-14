# @jilimb0/tgwrapper

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
