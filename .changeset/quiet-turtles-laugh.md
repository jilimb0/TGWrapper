---
"@jilimb0/tgwrapper": minor
"@jilimb0/tgwrapper-observability": patch
---

Prepare 0.5.0 release hardening with:

- frozen API surface guard in CI via `dist/index.d.ts` snapshot checks
- release readiness and go/no-go workflows for automated gating
- threshold-based reliability checks for load/chaos paths with repeated nightly runs
- observability contract, production checklist, and 0.4 -> 0.5 migration documentation
- release policy fail-fast for unsupported provenance mode on private repository
