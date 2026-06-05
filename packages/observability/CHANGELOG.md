# @tgwrapper/observability

## 0.9.1

### Patch Changes

- f9f6702: add platform trust and incident guidance

## 0.9.1

### Patch Changes

- 5ff96a7: add platform trust and incident guidance

## 0.9.0

### Minor Changes

- 19a0fe3: Migration, upgrade, improvements
- 19a0fe3: Migration, upgrade, improvement

## 0.8.0

### Minor Changes

- 406e9bc: Platform ready upgrade

## 0.7.1

### Patch Changes

- ac73c0d: Enhance documentation and add new validation and hardening resources

## 0.7.0

### Minor Changes

- c97e4f5: Project upgrade

## 0.6.1

### Patch Changes

- c10bde0: Improvements after audit

## 0.6.0

### Minor Changes

- 52edf00: Product ready improvements

## 0.5.5

### Patch Changes

- 497805e: Update to 10.0 Telegram Bot API

## 0.5.4

### Patch Changes

- f60b373: Improve production readiness with CI/security hardening, TypeScript 6 compatibility updates, and dependency safety fixes (including Vite patch-level security update).

## 0.5.3

### Patch Changes

- b9de156: Improve production readiness with CI/security hardening, TypeScript 6 compatibility updates, and dependency safety fixes (including Vite patch-level security update).

## 0.5.2

### Patch Changes

- f29938e: Improve TypeScript 6 compatibility in CI/build pipelines and refresh release, security, and onboarding documentation.

## 0.5.1

### Patch Changes

- 47ff001: Finalize APM package hardening for the 0.5.1 line.

  - add full tracing lifecycle with async context propagation and correlation IDs
  - add unified telemetry registry with counter/gauge/histogram/updown-counter
  - add exporter pipeline with retries/backoff/circuit breaker and graceful flush
  - add process telemetry, diagnostics snapshots, and fail-open reliability behavior
  - add wrappers for update/api/db/queue/scheduler instrumentation
  - add logging controls (runtime level override, sampling, redaction) and telemetry safety guards
  - add docs and tests for APM contract and integrations

## 0.5.0

### Minor Changes

- 4eff975: Add APM-grade observability primitives:

  - metrics registry with sampling, cardinality guard, and rate limiting
  - Prometheus rendering/exporter and OTLP metrics exporter
  - tracing API (`startSpan`, `endSpan`, `withSpan`) with correlation context propagation
  - error taxonomy (`class`, `code`, `retryable`, `source`)
  - runtime hook helpers for bot/api/queue/db events
  - observability health probes (`dropped metrics`, `export lag`, `queue depth`)
  - structured correlation ids in ECS logger output

  This prepares the package for the `0.5.0` feature line.

## 0.4.0

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
