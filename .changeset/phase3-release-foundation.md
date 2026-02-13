---
"@framework/core": minor
"@framework/adapter-redis": minor
"@framework/observability": minor
---

Phase 3 release foundation.

- add workspace package architecture and release automation baseline
- add production Redis adapter package with atomic CAS semantics
- add observability package and ECS-compatible logging primitives
- add runtime tenant guards (rate limiting and bounded concurrency)
- add webhook E2E harness and platform examples (Node, AWS Lambda, Cloudflare)
