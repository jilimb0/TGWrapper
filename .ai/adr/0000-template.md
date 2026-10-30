# ADR-0000: Title of Architectural Decision

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXXX  
**Date:** YYYY-MM-DD  
**Deciders:** Core Engineering Team  
**Applies-To:** `src/**`, `packages/core/**`  
**Supersedes:** None  
**Overrides-Global:** None (or `GLOBAL-XXX` from `golden-standards.md`)  

## Y-Summary
In the context of `<module/domain>`, facing `<problem/constraint>`, we decided for `<chosen option>` and neglected `<rejected options>`, to achieve `<system quality/benefit>`, accepting `<trade-off/cost>`.

## Context and Problem Statement
Concise description of the architectural problem, domain invariant, or technical force requiring a durable decision.

## Decision Drivers
- Functional requirement or domain invariant (e.g., Idempotency, Resilience, Numeric Precision, Privacy, Offline Sync, A11y/SSR)
- Operational simplicity, latency/memory budget, and maintainability

## Imperative Constraints for AI Agents (MUST / MUST NOT)
- **MUST:** Explicit rule that every change in `Applies-To` paths must obey.
- **MUST NOT:** Prohibited pattern, dependency, or cross-layer import.
- **DO NOT RE-INTRODUCE:** Specific legacy or rejected workaround that agents must not refactor back in.

## Considered Options & Rejected Alternatives
1. **Option 1 (Chosen): `<Name of chosen approach>`**
   - *Why chosen:* Satisfies all decision drivers with minimal complexity and strong contract safety.
2. **Option 2 (Rejected — DO NOT PROPOSE): `<Name of rejected approach>`**
   - *Why rejected:* Concrete technical failure mode, latency/memory penalty, security risk, or maintenance hazard.

## Consequences & Trade-offs
- **Positive:** Predictable behavior, verified invariants, zero regression risk.
- **Negative / Cost:** Localized boilerplate or migration step required.

## Verification Gate
- **Check Command:** `pnpm test` / `pnpm lint` / `pnpm typecheck` (exact command verifying compliance)
- **Code Anchors:** Key files containing `// See .ai/adr/NNNN-...` comments.
