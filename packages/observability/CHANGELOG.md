# @jilimb0/tgwrapper-observability

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
