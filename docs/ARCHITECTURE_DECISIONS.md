# Architecture Decisions

## ADR-001: Serverless-first stateless kernel
- Decision: `BotKernel` processes one update with externally persisted session.
- Rationale: Same bot code runs in long-lived Node and stateless functions.

## ADR-002: Unified webhook contract
- Decision: `WebhookRequest` / `WebhookResponse` is runtime-neutral.
- Rationale: Adapters map platform events without duplicating business logic.

## ADR-003: Optimistic locking and atomic session wrapper
- Decision: session writes use `compareAndSet` only via `runInSession`.
- Rationale: Prevent blind overwrite under concurrent updates.

## ADR-004: Router scenes with hooks
- Decision: `router.scene(state, handlers, hooks)` stores lifecycle hooks and state-first routing.
- Rationale: Scene behavior is explicit and deterministic.

## ADR-005: Resilient API transport
- Decision: retry+jitter, typed core errors, and circuit breaker around `callApi`.
- Rationale: Production bots must degrade gracefully during Telegram/API network incidents.

## ADR-006: Structured JSON logs
- Decision: logging contract emits machine-readable events.
- Rationale: Required for multi-tenant observability and incident triage.
