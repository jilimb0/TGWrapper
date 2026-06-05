# TGWrapper Claims Audit

This document tracks public claims that appear in README files, package pages, comparison docs, and proof-oriented docs. It is the source of truth for wording discipline: strong claims must either have a reproduction path or be softened.

Status legend:

- `Fully verified`: backed by an automated test, benchmark, release gate, or reproducible script.
- `Verified with caveats`: true for a defined environment or package subset, with limits documented.
- `Directionally true`: useful positioning, but wording must stay careful.
- `Remove or rewrite`: too broad, unfair, or not currently reproducible.

| Claim | Current / Likely Surface | Status | Basis | Required Wording |
| --- | --- | --- | --- | --- |
| Core update processing can reach 180,000 updates/sec | Root README, benchmark docs | Verified with caveats | `pnpm benchmark`, `pnpm benchmark:trend`, benchmark release gates | Say "benchmark profile has reached..." and include hardware/scenario caveats. Do not imply real Telegram end-to-end throughput. |
| Core processing overhead is below 0.5ms/update | Root README, performance docs | Verified with caveats | Benchmark scripts and trend gates | Scope to simulated core processing excluding Telegram API, network, Redis, handlers, logging exporters. |
| TGWrapper is "best-in-class" for distributed / AI / observability bots | Root README comparison table | Remove or rewrite | No objective cross-project benchmark | Replace with "optimized for..." or "strong fit when...". |
| Redis CAS prevents silent concurrent overwrites | Root README, Redis README, guarantees docs | Fully verified | Redis integration tests, chaos/fuzz scenarios, Redis Lua CAS design | Keep strong wording, but specify it returns `ok: false`; application code must decide retry/conflict behavior. |
| Redis sessions provide zero data loss | Root README | Remove or rewrite | Redis CAS protects concurrent writes, not all crash/data-loss cases | Replace with "no silent concurrent overwrites" and "durable when Redis is available and configured". |
| Distributed rate limiter is atomic | Redis README, docs | Fully verified | Lua script semantics and Redis integration tests | Keep. Specify no fairness queue and clock drift caveats. |
| Runtime portability across Node.js, AWS Lambda, Cloudflare Workers | Root README, compatibility docs | Verified with caveats | Core uses fetch-first/webhook-compatible design; examples exist | Scope by capability. Core webhook is portable; polling, Redis TCP, AsyncLocalStorage, and exporters differ by runtime. Link to compatibility matrix. |
| Observability context is automatically propagated through async calls | Observability README | Verified with caveats | Node.js `AsyncLocalStorage` tests | Strong in Node.js. In serverless/edge, classify as partial/degraded unless runtime provides equivalent context propagation. |
| Telemetry hooks run below 0.05ms overhead | Observability README | Directionally true | Needs a dedicated telemetry benchmark source | Keep only if linked to a benchmark. Otherwise say "designed to be low-overhead". |
| Cold starts are sub-50ms on Workers/Lambda | GTM/migration docs | Remove or rewrite | Depends on platform, memory, bundle, network, cold/warm state | Replace with "designed for small bundles and serverless-friendly startup; measure in your deployment profile." |
| "No changes to handler code required" when adding Redis | Redis README | Verified with caveats | Adapter shape preserves session/rate limiter integration points | Scope to compatible session/rate limiter integration. Do not imply every app migration is automatic. |
| "Zero any on the critical path" | Public/docs if present | Directionally true | Needs API snapshot/type lint evidence | Use only if backed by a type-level check; otherwise say "typed public contracts". |
| "Production-ready" | README/package descriptions | Directionally true | Release gates exist, packages are pre-1.0 | Prefer "production-oriented", "designed for production-grade", or "early production" until broader adoption evidence exists. |

## Current High-Risk Wording To Avoid

- "Best-in-class"
- "Zero data loss"
- "No rewriting ever"
- "Runs identically everywhere"
- "Guaranteed sub-50ms cold starts"
- "Production-ready" without stability tier and caveats

## Canonical Positioning Sentence

TGWrapper is a production-first TypeScript platform for distributed Telegram bots.

Secondary messages must follow this order:

1. Production-first
2. Distributed-safe
3. Observability-aware
4. AI-ready
5. Runtime-portable with documented caveats

