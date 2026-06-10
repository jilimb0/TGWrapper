# @tgwrapper/adapter-redis

## 0.8.2

### Patch Changes

- fd432ba: Enhance docs, refactor

## 0.8.1

### Patch Changes

- 8fc3cfe: Upgrade packages product readiness

## 0.8.1

### Patch Changes

- f9f6702: add platform trust and incident guidance

## 0.8.1

### Patch Changes

- 5ff96a7: add platform trust and incident guidance

## 0.8.0

### Minor Changes

- 19a0fe3: Migration, upgrade, improvements
- 19a0fe3: Migration, upgrade, improvement

## 0.7.0

### Minor Changes

- 406e9bc: Platform ready upgrade

## 0.6.1

### Patch Changes

- ac73c0d: Enhance documentation and add new validation and hardening resources

## 0.6.0

### Minor Changes

- c97e4f5: Project upgrade

## 0.5.1

### Patch Changes

- c10bde0: Improvements after audit

## 0.5.0

### Minor Changes

- 52edf00: Product ready improvements

## 0.4.4

### Patch Changes

- 497805e: Update to 10.0 Telegram Bot API

## 0.4.3

### Patch Changes

- f60b373: Improve production readiness with CI/security hardening, TypeScript 6 compatibility updates, and dependency safety fixes (including Vite patch-level security update).

## 0.4.2

### Patch Changes

- b9de156: Improve production readiness with CI/security hardening, TypeScript 6 compatibility updates, and dependency safety fixes (including Vite patch-level security update).

## 0.4.1

### Patch Changes

- f29938e: Improve TypeScript 6 compatibility in CI/build pipelines and refresh release, security, and onboarding documentation.

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
