# ADR-0005: Atomic CAS Approval Gates and Constant-Time Webhook Verification

**Status:** Accepted  
**Date:** 2026-11-09  
**Deciders:** Core Engineering Team  
**Applies-To:** `src/adapters/webhook-handler.ts`, `src/orchestration/**`, `packages/observability/**`  
**Supersedes:** None  
**Overrides-Global:** None  

## Y-Summary
In TGWrapper, facing race conditions between Web and Telegram approvals and timing attacks on webhooks, we implement ApprovalGateBotBridge using SessionManager CAS and crypto.timingSafeEqual in webhook-handler.

## Context and Problem Statement
Operator approvals for dangerous multi-agent operations can originate both from Web UI and Telegram Bot inline buttons.

## Decision Drivers
- Compare-And-Swap race prevention
- Axis 5 Zero-Leakage & constant-time security
- Deep PII and bot token redaction

## Imperative Constraints for AI Agents (MUST / MUST NOT)
- **MUST:** Verify webhook secret headers using crypto.timingSafeEqual on equal byte lengths
- **MUST:** Pass expectedVersion in Telegram inline button callbacks (ag:<action>:<gateId>:<version>)
- **MUST:** Perform deep recursive PII redaction and mask Telegram bot tokens as bot[REDACTED]
- **MUST NOT:** Never execute approval callbacks if database/session CAS version has already advanced

## Considered Options & Rejected Alternatives
1. **Option 1 (Chosen): ApprovalGateBotBridge wired to SessionManager compareAndSet and constant-time webhook verification**
   - *Why chosen:* Satisfies all decision drivers and domain invariants.
2. **Option 2 (Rejected — DO NOT PROPOSE): Ad-hoc unvalidated implementation**
   - *Why rejected:* Violates deterministic contract and causes architectural drift.

## Consequences & Trade-offs
- **Positive:** Deterministic enforcement and zero architectural drift.
- **Negative / Cost:** Requires compliance across `src/adapters/webhook-handler.ts`, `src/orchestration/**`, `packages/observability/**`.

## Verification Gate
- **Check Command:** `pnpm test`
