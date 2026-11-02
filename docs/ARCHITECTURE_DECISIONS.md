# Architecture Decisions

TGWrapper manages architectural decisions through formal Architecture Decision Records (ADRs) conforming to the [ADR Governance Protocol](../.ai/ARCHITECTURE.md).

Formal, immutable ADRs are maintained in [`.ai/adr/`](../.ai/adr/):

## Active Formal ADRs

- **[ADR-0001: Zero-Dependency Serverless Core, Automated Schema Parity & Dual ESM/CJS Build](../.ai/adr/0001-zero-dependency-serverless-fsm-and-schema-parity.md)**
  - *Summary:* Zero external runtime dependencies in `@tgwrapper/core`, automated schema drift detection gates against upstream Telegram Bot API, dual ESM/CJS compilation, and locked performance/size budgets.
- **[ADR-0002: Atomic Compare-And-Swap (CAS) Session Management & Pluggable Storage Adapters](../.ai/adr/0002-atomic-cas-session-management-and-storage-adapters.md)**
  - *Summary:* Elimination of silent session race conditions via atomic CAS versioning (`compareAndSet`), multi-engine adapters (`adapter-redis`, `adapter-dynamodb`, `adapter-mongodb`), and automatic fallback (`FailsafeSessionStorage`).
- **[ADR-0003: Resilient Telegram API Transport with Circuit Breaker and Full Jitter Backoff](../.ai/adr/0003-resilient-transport-circuit-breaker-and-jittered-backoff.md)**
  - *Summary:* Defense against upstream 429 rate bans and network outages via TokenBucket limiters, 3 retries with Full Jitter, and a tri-state `CircuitBreaker`.
- **[ADR-0004: Structured Telemetry, OpenTelemetry Semantic Conventions, and Zero Token/PII Leakage](../.ai/adr/0004-structured-telemetry-opentelemetry-and-zero-pii-leakage.md)**
  - *Summary:* First-party telemetry (`@tgwrapper/observability`), `AsyncLocalStorage` trace propagation, Prometheus metrics exports, and mandatory bot token redaction.

---

## Historical Decision Context (v0.2.x Baseline)

These initial decisions laid the technical foundation for the early prototypes and have since been formalized into the ADRs above:

- **ADR-001: Serverless-first stateless kernel** → Formalized in ADR-0001.
- **ADR-002: Unified webhook contract** → Formalized in ADR-0001.
- **ADR-003: Optimistic locking and atomic session wrapper** → Formalized in ADR-0002.
- **ADR-004: Router scenes with hooks** → Integrated into `@tgwrapper/core` routing pipeline.
- **ADR-005: Resilient API transport** → Formalized in ADR-0003.
- **ADR-006: Structured JSON logs** → Formalized in ADR-0004.
