# TGWrapper Documentation

TGWrapper is a production-first TypeScript platform for distributed Telegram bots. Use this hub to choose the right path, verify claims, and understand the support boundaries before adopting the platform.

---

## Start Here

### 1. I want to quickly get a bot running

- [Quick Start](./QUICK_START.md) — first bot in under 5 minutes.
- [Grow with TGWrapper](./GROW_WITH_TGWRAPPER.md) — step-by-step path from dev to production.
- [Tutorials](./TUTORIALS.md) — structured learning from echo bot to AI-native application.
- Starter examples: [polling](../examples/polling-starter), [multi-instance Redis](../examples/multi-instance-redis-starter), [serverless webhook](../examples/serverless-webhook-starter).

### 2. I'm an architect / team lead evaluating the stack

- [Why TGWrapper?](./WHY_TGWRAPPER.md) — architecture and decision rationale.
- [Compatibility Matrix](./COMPATIBILITY_MATRIX.md) — runtime and capability support boundaries.
- [Platform Guarantees](./PLATFORM_GUARANTEES.md) — what we promise and what we do not.
- [Comparison Guide](./COMPARISON.md), [grammY vs TGWrapper](./GRAMMY_VS_TGWRAPPER.md), and [Comparison vs Python](./COMPARISON_VS_PYTHON.md) — how TGWrapper differs from alternative bot frameworks.
- [Longevity and Commitments](./LONGEVITY_AND_COMMITMENTS.md) — stability posture, versioning, and long-term compatibility.

### 3. I'm SRE / ops

- [Reliability Semantics](./RELIABILITY_SEMANTICS.md) — expected failure modes and recovery behavior.
- [Failure Drills](./FAILURE_DRILLS.md) — operational runbooks for outages and chaos scenarios.
- [Operations Runbook](./OPERATIONS_RUNBOOK.md) — logging, alerting, and incident response.
- [REDIS_RUNTIME.md](./REDIS_RUNTIME.md), [REDIS_FAILURE_MODES.md](./REDIS_FAILURE_MODES.md), [REDIS_TOPOLOGIES.md](./REDIS_TOPOLOGIES.md) — Redis production best practices.
- [OBSERVABILITY_RUNTIME_SUPPORT.md](./OBSERVABILITY_RUNTIME_SUPPORT.md) and [OBSERVABILITY_STABILITY_CONTRACT.md](./OBSERVABILITY_STABILITY_CONTRACT.md) — telemetry and trace stability.

---

## Truth And Evidence

- [Claims Audit](./CLAIMS_AUDIT.md) - Public claim classification and safe wording rules.
- [Proof Map](./PROOF_MAP.md) - Mapping from claims to tests, workflows, limitations, and reproduction paths.
- [Compatibility Matrix](./COMPATIBILITY_MATRIX.md) - Capability-by-runtime truth table.
- [Platform Guarantees](./PLATFORM_GUARANTEES.md) - Unified guarantees and non-guarantees across packages.
- [Deployment Profiles](./DEPLOYMENT_PROFILES.md) - Blessed deployment shapes and caveats.
- [Demo Flows](./DEMO_FLOWS.md) - Three canonical demo stories for launch and onboarding.

---

## Decision Matrices

### Polling vs. Webhook Transport

| Feature / Factor     | Polling Mode (`mode: 'polling'`)                | Webhook Mode (`mode: 'webhook'`)                     |
| -------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| Execution pattern    | Background long-polling loop                    | Event-driven request ingestion                       |
| Local development    | Easiest, no public HTTP endpoint required       | Requires tunnel or local webhook harness             |
| Infrastructure shape | Long-running process                            | HTTP/serverless/edge ingress                         |
| Scaling model        | Single loop; use carefully for larger workloads | Better fit for horizontal and serverless scaling     |
| Runtime support      | Node.js process                                 | Node.js, AWS Lambda, Cloudflare Workers with caveats |

---

## 🙋 Central Platform FAQ

### Q1: Is Redis required?

**No**, Redis is optional. You can build and run fully functional bots using default in-memory setups.

- **When to add Redis:** As soon as you scale to multiple concurrent server instances or serverless containers. Redis acts as the synchronization layer for distributed rate limits and FSM user sessions (protecting state from concurrent updates).

### Q2: Is TGWrapper suitable for Serverless environments (AWS Lambda / Cloudflare Workers)?

**Yes for webhook-style core handlers, with capability-specific caveats.** Polling is unsupported in serverless/edge runtimes. Redis TCP clients, AsyncLocalStorage propagation, OpenTelemetry exporters, and graceful shutdown semantics differ by runtime. Check the [Compatibility Matrix](./COMPATIBILITY_MATRIX.md) before choosing a profile.

### Q3: Why is TGWrapper better for AI-native bots?

1. **Concurrency Safety:** Multi-turn AI conversations involve delayed model replies. Concurrent buttons presses from users are safely guarded by the Redis Compare-And-Swap (CAS) session adapter, avoiding state overwrites.
2. **Context Correlation Tracing:** Downstream LLM calls and nested tool spans are mapped automatically to the incoming Telegram message trace ID via `AsyncLocalStorage`.
3. **Caveat:** AI tracing quality depends on runtime async context support and whether the LLM provider exposes token/cost metadata.

---

## 📑 Core Documentation Index

### Getting Started & Guides

- [Why TGWrapper?](./WHY_TGWRAPPER.md) - Positioning and architectural wedge.
- [Deployment Profiles](./DEPLOYMENT_PROFILES.md) - Supported runtime shapes.
- [Compatibility Matrix](./COMPATIBILITY_MATRIX.md) - Capability support by runtime.
- [Comparison Guide](./COMPARISON.md) - Deep feature comparison vs. grammY and Telegraf.
- [Bot Development Guide](./BOT_DEVELOPMENT_GUIDE.md) - Client parameters, session shapes, and commands.

### Migration Manuals

- [Migration from grammY](./MIGRATION_FROM_GRMMY.md) - Direct mapping guides.
- [Migration from Telegraf](./MIGRATION_FROM_TELEGRAF.md) - Interface mapper.
- [Migration from Node Telegram Bot API](./MIGRATION_FROM_NODE_TELEGRAM_BOT_API.md) - Legacy transition.

### Operational Runbooks

- [Production Stack Recipe](./PRODUCTION_STACK_RECIPE.md) - Blueprint stack layouts.
- [Production Checklist](./PRODUCTION_CHECKLIST.md) - Deployment audit items.
- [Operations Runbook](./OPERATIONS_RUNBOOK.md) - Debugging, logs, and alerts config.
- [Observability Contract](./OBSERVABILITY_CONTRACT.md) - Standard performance tags and logs.
- [When To Add Redis](./WHEN_TO_ADD_REDIS.md) - Thresholds for moving from in-memory state to Redis.
- [Redis Incident Playbooks](./redis/INCIDENT_PLAYBOOKS.md) - Redis unavailable, clock drift, hotspot contention, eviction, and cluster-slot response guides.
- [Observability Incident Guide](./OBSERVABILITY_INCIDENTS.md) - Incident-first entry path for duplicate updates, missing correlation, slow handlers, failed AI calls, and retry storms.
- [Observability Runtime Support](./OBSERVABILITY_RUNTIME_SUPPORT.md) - Runtime support matrix for observability features.
- [Observability Stability Contract](./OBSERVABILITY_STABILITY_CONTRACT.md) - Stable, beta, and experimental telemetry surfaces.

### Architecture & Release Policy

- [Architecture Decision Records](./ARCHITECTURE_DECISIONS.md) - ADR repository log.
- [Telegram API Compatibility targets](./TELEGRAM_API_COMPATIBILITY.md) - Schema sync protocols.
- [Release Quality Gates](./RELEASE_POLICY.md) - Changesets validation.

### Evidence & Trust

- [Claims Audit](./CLAIMS_AUDIT.md) - Status of strong public claims.
- [Proof Map](./PROOF_MAP.md) - Evidence and reproduction path.
- [Platform Guarantees](./PLATFORM_GUARANTEES.md) - Unified guarantee language.
- [Governance](./GOVERNANCE.md) - Roles, process, and project decision rules.
- [Longevity and Commitments](./LONGEVITY_AND_COMMITMENTS.md) - Long-term compatibility posture.

### Adoption And Team Buy-In

- [Demo Flows](./DEMO_FLOWS.md) - Canonical simple, Redis, and AI observability demos.
- [Proof of Viability](./PROOF_OF_VIABILITY.md) - 90-minute confidence path.
- [Team Evaluation Checklist](./champion/TEAM_EVALUATION_CHECKLIST.md) - Structured adoption review.
- [Pilot Playbook](./champion/PILOT_PLAYBOOK.md) - 30/60/90-day rollout guide.
