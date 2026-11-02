# ADR-0002: Atomic Compare-And-Swap (CAS) Session Management and Pluggable Storage Adapters

**Status:** Accepted  
**Date:** 2026-11-02  
**Deciders:** Core Engineering Team  
**Applies-To:** `src/storage/**`, `src/fsm/**`, `packages/adapter-redis/**`, `packages/adapter-dynamodb/**`, `packages/adapter-mongodb/**`  
**Supersedes:** Historical ADR-003  
**Overrides-Global:** None (`GLOBAL-IDEM-01`, `GLOBAL-RES-01`)  

## Y-Summary
In the context of multi-replica serverless and clustered Telegram bot instances receiving concurrent updates for the same chat/user, we decided for **atomic Compare-And-Swap (CAS) state versioning (`compareAndSet`) via `SessionManager.runInSession` with pluggable storage adapters and automatic `FailsafeSessionStorage` memory fallback** instead of in-memory or blind Last-Write-Wins (LWW) overwrites, to eliminate silent state corruption and lost cart/conversation updates under load, accepting explicit retry loops and conflict handling requirements.

## Context and Problem Statement
Mainstream Telegram libraries (Telegraf, Grammy) rely on naive session middleware that reads state at the start of a handler and writes it unconditionally at the end. In multi-instance or serverless deployments, duplicate or simultaneous user actions (e.g. quick button double-clicks) result in race conditions where instance A overwrites mutations made by instance B without warning.

## Decision Drivers
- Zero silent data loss across horizontally scaled bot instances.
- Multi-engine storage support: Redis (Lua CAS), AWS DynamoDB (`attribute_exists` / version condition expressions), and MongoDB (`findOneAndUpdate` version match).
- High availability: when Redis or external databases degrade, bots must gracefully degrade to local in-memory fallback without crashing (`FailsafeSessionStorage`).
- Multi-tenant isolation: strict key prefixing by tenant and bot ID (`createSessionKey(tenantId, botId, sessionId)`).

## Imperative Constraints for AI Agents (MUST / MUST NOT)
- **MUST:** Enforce that all session state mutations go through `SessionManager.runInSession` or explicit `compareAndSet(key, expectedVersion, nextState)`.
- **MUST:** Ensure all storage adapters implement the canonical `SessionStorage` interface contract with version increments on each successful mutation.
- **MUST:** Support multi-tenant key namespacing in all session keys (`${tenantId}:${botId}:${sessionId}`).
- **MUST NOT:** Never implement or re-introduce blind `set(key, state)` overwrites that bypass version comparison in multi-instance adapters.

## Considered Options & Rejected Alternatives
1. **Option 1 (Chosen): Versioned CAS (Compare-And-Swap) with pluggable adapters & memory fallback**
   - *Why chosen:* Guarantees consistency across distributed workers, provides deterministic conflict detection, and prevents silent state loss.
2. **Option 2 (Rejected — DO NOT RE-INTRODUCE): Blind Last-Write-Wins (LWW) session middleware**
   - *Why rejected:* Causes irrecoverable data loss and cart corruption under concurrent webhook delivery.
3. **Option 3 (Rejected): Heavy distributed locking (Redlock / ZooKeeper)**
   - *Why rejected:* Adds massive latency overhead (roundtrips, lock timeouts, clock drift sensitivities) inappropriate for sub-50ms bot responses.

## Consequences & Trade-offs
- **Positive:** Provable state consistency, resilient multi-region operation, zero ghost overwrites.
- **Negative / Cost:** Handlers must handle potential `SessionConflictError` or rely on automatic retry policies.

## Verification Gate
- **Check Command:** `pnpm test` (specifically `test/failsafe-session-storage.test.ts`, `test/adapter-contract.test.ts`, `test/chaos/multi-tenant.chaos.test.ts`)
- **Code Anchors:** `src/storage/failsafe-session-storage.ts`, `packages/adapter-redis/src/session-storage.ts`
