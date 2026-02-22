# @jilimb0/tgwrapper-observability

## 0.3.0

### Minor Changes

- Add production-ready developer APIs and tooling for building complex bots:

  - core: high-level API methods (`sendDocument`, `getFileLink`, `editMessage*`), runtime lifecycle (`start/stop/onError`), runtime and API hooks, and official testkit exports
  - adapter-redis: generic KV API with namespace/prefix utilities and atomic index helpers
  - observability: async/timer helpers, runtime observability binding, and standardized metrics snapshots

  This release improves day-1 and day-2 usability while keeping backward compatibility for existing integrations.

## 0.2.2

### Patch Changes

- 64fc2b5: Prepare 0.5.0 release hardening with:

  - frozen API surface guard in CI via `dist/index.d.ts` snapshot checks
  - release readiness and go/no-go workflows for automated gating
  - threshold-based reliability checks for load/chaos paths with repeated nightly runs
  - observability contract, production checklist, and 0.4 -> 0.5 migration documentation
  - release policy fail-fast for unsupported provenance mode on private repository

## 0.2.1

### Patch Changes

- c037bd5: Republish adapter and observability packages with compiled dist artifacts.

  Also enforce workspace-wide build in CI and release pipelines to prevent publishing packages without runtime/type entrypoints.

## 0.2.0

### Minor Changes

- 8fa2952: Phase 3 release foundation.

  - add workspace package architecture and release automation baseline
  - add production Redis adapter package with atomic CAS semantics
  - add observability package and ECS-compatible logging primitives
  - add runtime tenant guards (rate limiting and bounded concurrency)
  - add webhook E2E harness and platform examples (Node, AWS Lambda, Cloudflare)
