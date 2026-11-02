# ADR-0004: Structured Telemetry, OpenTelemetry Semantic Conventions, and Zero Token/PII Leakage

**Status:** Accepted  
**Date:** 2026-11-02  
**Deciders:** Core Engineering Team  
**Applies-To:** `src/observability/**`, `packages/observability/**`  
**Supersedes:** Historical ADR-006  
**Overrides-Global:** None (`GLOBAL-PRIV-01`, `GLOBAL-LOG-01`)  

## Y-Summary
In the context of multi-tenant bot observability across high-throughput distributed workers and edge functions, facing operational blind spots and credential exposure risks, we decided for **first-party telemetry (`@tgwrapper/observability`) featuring `AsyncLocalStorage`-driven `trace_id` correlation, OpenTelemetry standard semantic conventions, Prometheus metrics, and mandatory cryptographic redaction of bot tokens and sensitive payload fields** instead of generic `console.log` statements or unredacted raw payload logging, to guarantee enterprise auditability and zero secret leakage, accepting the overhead of span management and string redaction passes.

## Context and Problem Statement
Telegram bot updates frequently contain sensitive user data (usernames, phone numbers, location, payment queries) and authorization credentials (`bot<token>`). Unstructured logging produces noisy, unsearchable logs where user transactions cannot be traced across microservices. Furthermore, logging raw URLs or error stack traces risks exposing Telegram Bot API tokens to third-party log aggregators.

## Decision Drivers
- Strict Privacy & Zero-Leakage (Axis 5): zero raw bot tokens (`bot<token>`) or user secrets in logs.
- Deterministic trace correlation across asynchronous event loops using Node's `AsyncLocalStorage`.
- OpenTelemetry interoperability with standard semantic conventions for messaging and HTTP.
- Structured ECS-compatible JSON output for high-ingestion pipelines (Datadog, Elastic, CloudWatch, Prometheus).

## Imperative Constraints for AI Agents (MUST / MUST NOT)
- **MUST:** Redact Telegram bot tokens from all logged URLs, error messages, and stack traces (`/bot[0-9]+:[a-zA-Z0-9_-]+/` -> `/bot[REDACTED]/`).
- **MUST:** Inject `trace_id`, `tenant_id`, and `bot_id` into all structured log records emitted during update processing.
- **MUST NOT:** Never use unredacted `console.log(update)` or dump raw webhook request bodies containing payment or auth credentials.
- **MUST NOT:** Never introduce heavy external logging SDKs into `@tgwrapper/core`; advanced exporters belong exclusively in `@tgwrapper/observability`.

## Considered Options & Rejected Alternatives
1. **Option 1 (Chosen): Structured JSON logging + AsyncLocalStorage + OpenTelemetry package + Redaction pipeline**
   - *Why chosen:* Provides end-to-end distributed observability without vendor lock-in or credential leakage.
2. **Option 2 (Rejected — DO NOT RE-INTRODUCE): Raw `console.log` debugging**
   - *Why rejected:* Impossible to correlate under concurrent load (100+ updates/sec); high risk of leaking bot tokens.
3. **Option 3 (Rejected): Hard dependency on full OpenTelemetry SDK in `@tgwrapper/core`**
   - *Why rejected:* Bloats bundle size for edge runtimes (Cloudflare Workers, AWS Lambda).

## Consequences & Trade-offs
- **Positive:** Instant root-cause identification in production, SOC2/GDPR-compliant secret redaction.
- **Negative / Cost:** Minimal CPU overhead for regex redaction and span context creation.

## Verification Gate
- **Check Command:** `pnpm test` (specifically `test/observability.apm.test.ts`, `test/observability.apm.v051.test.ts`, and `packages/observability` tests)
- **Code Anchors:** `packages/observability/src/redact.ts`, `packages/observability/src/otel.ts`, `src/observability/logger.ts`
