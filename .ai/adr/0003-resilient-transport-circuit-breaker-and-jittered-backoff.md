# ADR-0003: Resilient Telegram API Transport with Circuit Breaker and Full Jitter Backoff

**Status:** Accepted  
**Date:** 2026-11-02  
**Deciders:** Core Engineering Team  
**Applies-To:** `src/core/**`, `src/adapters/**`, `src/update-loop/**`  
**Supersedes:** Historical ADR-005  
**Overrides-Global:** None (`GLOBAL-RES-01`, `GLOBAL-RES-02`)  

## Y-Summary
In the context of outbound communication with the official Telegram Bot API gateway, facing upstream network blips, HTTP 429 rate limiting, and temporary service outages, we decided for **a multi-layered resilience architecture including TokenBucket rate limiters, 3-retry exponential backoff with Full Jitter, `retry_after` header adherence, and a tri-state `CircuitBreaker` (`closed`/`open`/`half-open`) around `callApi`** instead of raw unthrottled HTTP requests or infinite blocking retry loops, to protect bots from cascading failures and rate-ban penalties, accepting occasional `CircuitOpenError` when Telegram is genuinely unreachable.

## Context and Problem Statement
Telegram Bot API enforces strict rate limits (typically ~30 messages/second globally per bot, 1 message/second per private chat). Bursty traffic or upstream maintenance can cause HTTP 429 (`Too Many Requests`) or 5xx outages. Uncontrolled retries amplify thundering herd problems, leading to prolonged IP bans or worker exhaustion.

## Decision Drivers
- Conform to Telegram Bot API rate limiting guidelines without external broker dependencies.
- Strict timeout ceilings: prevent zombie connections in serverless functions.
- Resilience Axis compliance: 3 retries, exponential backoff with Full Jitter, and immediate respect of `parameters.retry_after`.
- Tri-state circuit breaker to fail fast and protect backend resources when upstream is down.

## Imperative Constraints for AI Agents (MUST / MUST NOT)
- **MUST:** Enforce retry logic with Full Jitter (`Math.random() * backoff`) rather than fixed intervals or pure exponential backoff.
- **MUST:** Always parse and respect `parameters.retry_after` received in Telegram 429 responses before attempting retries.
- **MUST:** Wrap external Telegram HTTP requests in `CircuitBreaker` and provide typed errors (`TelegramApiError`, `CircuitOpenError`).
- **MUST NOT:** Never perform unthrottled infinite retry loops or swallow network abort signals.

## Considered Options & Rejected Alternatives
1. **Option 1 (Chosen): Integrated TokenBucket + Full Jitter Backoff + Tri-State Circuit Breaker**
   - *Why chosen:* Provides immediate defense against thundering herds and 429 rate bans while remaining zero-dependency.
2. **Option 2 (Rejected — DO NOT RE-INTRODUCE): Naive immediate retry loops**
   - *Why rejected:* Aggravates Telegram 429 rate bans and exhausts serverless execution budgets.
3. **Option 3 (Rejected): External message queue required for every request**
   - *Why rejected:* Violates the zero-dependency, serverless-first architectural baseline.

## Consequences & Trade-offs
- **Positive:** High resilience under load, automatic recovery after network blips, zero upstream ban risks.
- **Negative / Cost:** Outbound API calls can reject with `CircuitOpenError` during prolonged outages, requiring callers to handle degraded state.

## Verification Gate
- **Check Command:** `pnpm test` (specifically `test/api-client.resilience.test.ts`, `test/guards.test.ts`)
- **Code Anchors:** `src/core/circuit-breaker.ts`, `src/core/api-client.ts`
