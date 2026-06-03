# TGWrapper Project Doctrine

> Version: 0.11.x · Status: Active · Audience: Contributors, Adopters, Maintainers

This document defines what TGWrapper is, what it is not, and who it is built for. It exists to prevent scope creep, to guide contribution decisions, and to give adopters an honest picture of the project's identity.

---

## 1. Mission Statement

**TGWrapper is a TypeScript framework for building production-oriented Telegram bots that need to operate reliably across multiple runtime environments.**

The primary design pressures are:

- **Runtime portability.** The same bot logic should work in Node.js long-polling, serverless webhook handlers (Cloudflare Workers, AWS Lambda), and any other HTTP-capable runtime.
- **Production resilience.** Distributed state, rate limiting, and structured observability should be first-class, not afterthoughts.
- **Typed contracts.** All Telegram API interactions should be statically typed and verifiable at compile time.

---

## 2. Target Audience

TGWrapper is designed for **developers building structured Telegram applications** who care about:

| Audience Segment | Primary Fit |
|---|---|
| **Teams running bots at scale** (>100 k daily active users) | ✅ Primary target |
| **Engineers deploying to serverless / edge runtimes** | ✅ Primary target |
| **Developers building AI-native bots** (LLM integrations, stateful conversations) | ✅ Excellent fit |
| **Backend engineers who want typed API contracts** | ✅ Excellent fit |
| **Developers building small personal bots** | ✅ Works well; may be more than needed |
| **Teams needing a drag-and-drop no-code bot builder** | ❌ Not the right tool |
| **Python / Go / other language ecosystems** | ❌ TypeScript-only |

---

## 3. Core Identity

### What TGWrapper IS:

1. **A typed runtime adapter** for the Telegram Bot API — it handles polling, webhook ingestion, and API method calls with full TypeScript types.
2. **A middleware-first framework** — update processing is modelled as a composable chain of handlers, not a rigid class hierarchy.
3. **A platform abstraction layer** — the same bot interface works across Node.js, Cloudflare Workers, and AWS Lambda without code changes.
4. **A Redis runtime layer** — the `adapter-redis` package upgrades in-process primitives (rate limiting, sessions) to distributed, multi-instance-safe equivalents.
5. **An observable system** — structured events, trace context, and pull-based metrics are built in, not bolted on.

### What TGWrapper is NOT:

1. **Not a UI/markup builder.** TGWrapper does not provide a DSL for generating Telegram keyboard layouts, inline button trees, or message templates. You compose raw Telegram payload objects directly.
2. **Not an ORM or database.** Session adapters are thin Redis wrappers. They do not provide query languages, migrations, or relational modelling.
3. **Not a file server.** File upload/download helpers wrap Telegram's multipart API but do not provide caching, streaming proxies, or CDN integration.
4. **Not a bot hosting platform.** TGWrapper does not deploy your bot. It gives you the runtime primitives; you own the infrastructure.
5. **Not a framework for every programming language.** TypeScript (and by extension, JavaScript) only.
6. **Not a batteries-everything framework.** We prefer a small, composable core over a monolith that owns your entire application.

---

## 4. Design Principles

### 4.1 Explicit over Implicit

Configuration is always passed explicitly. There is no global state, no hidden singletons, and no magic environment variable scanning unless documented. Everything the bot does should be traceable to a line of code you wrote.

### 4.2 Fail Loudly at the Type Level

TypeScript errors are preferable to runtime surprises. The API surface is designed so that common mistakes — missing a required field, passing the wrong update type to a handler — produce compile-time errors, not runtime panics.

### 4.3 Runtime Portability is Non-Negotiable

Every new primitive added to the core must work in at minimum: Node.js, Cloudflare Workers, and AWS Lambda. Features that require Node.js-specific APIs (e.g. `fs`, `net`) belong in separate, clearly-labelled adapters.

### 4.4 Evidence Over Claims

Documentation claims must be backed by tests, benchmarks, or explicit caveats. If something is not tested, we say so. If something has a performance ceiling, we document it.

### 4.5 Stability Tiers are Honest

Every package surface is classified as `Experimental`, `Beta`, `Early Production`, or `Stable`. API stability guarantees are scoped to the declared tier. We do not call things Stable until they have been validated in real production workloads.

---

## 5. Non-Goals (Explicit)

The following are deliberate non-goals for TGWrapper. If you need these, look elsewhere or build on top of TGWrapper yourself:

| Non-Goal | Rationale |
|---|---|
| Auto-generated admin dashboards | Out of scope; use existing BFF patterns |
| Bot marketplace / plugin registry | Increases maintenance surface without core value |
| Multi-platform support (Discord, Slack, WhatsApp) | Dilutes the Telegram-specific typed contract value |
| GraphQL / REST API generation for bots | Different architectural pattern; not a framework concern |
| Built-in authentication / OAuth flows | Application-layer concern; not a bot-protocol concern |
| Serverless cold-start optimization framework | Depends on deployment target; out of scope |
| Visual flow builder / drag-and-drop | Requires a product layer entirely separate from this framework |

---

## 6. Versioning & Stability Policy

- TGWrapper follows **Semantic Versioning (SemVer)**.
- The `0.x` range is explicitly pre-1.0. Breaking changes may occur in minor versions, with migration guidance in `CHANGELOG.md`.
- The `1.0.0` milestone requires: validated stability of the core API surface, documented test coverage, and at least one reference production deployment.
- Package-level stability tiers (Experimental / Beta / Early Production / Stable) are independent from the workspace version number.

See [`docs/RELEASE_POLICY.md`](./RELEASE_POLICY.md) for the full release process.

---

## 7. Contribution Boundaries

When evaluating a new contribution, ask:

1. **Does it serve the target audience?** (See Section 2)
2. **Is it consistent with the core identity?** (See Section 3)
3. **Does it introduce a runtime portability assumption?** If so, it must be isolated in a clearly-named adapter package.
4. **Does it expand the API surface without a stability tier?** New public APIs must be classified before merging.
5. **Is it covered by tests?** Untested features do not belong in production-tier packages.

If the answer to any of these is "no" or "unclear", open a discussion before implementation.

---

## 8. Strategic Positioning

TGWrapper's differentiated position in the Telegram TypeScript ecosystem:

| Dimension | TGWrapper | grammY | Telegraf |
|---|---|---|---|
| Primary orientation | Production / multi-instance | Feature-rich / plugin ecosystem | Simplicity / Express-like |
| TypeScript depth | Full type inference for API | Full type inference for API | Partial |
| Redis / distributed | First-class (adapter package) | Plugin ecosystem | Manual |
| Observability | First-class (observability package) | Manual | Manual |
| Serverless runtime | Core design requirement | Supported | Limited |
| API schema drift detection | Built-in tooling | Not included | Not included |

TGWrapper is not trying to win on plugin count. It is optimized for the intersection of: **TypeScript depth + runtime portability + production operational tooling**.

---

## 9. What "Production-Ready" Means Here

We use "production-oriented" and "designed for production use" deliberately. This means:

- Structured error handling with no silent swallows
- Observable internals (metrics + events)
- Typed API contracts with zero `any` leakage on the critical path
- Documented failure modes and recovery strategies
- Explicit stability classifications for all public surfaces

It does **not** mean:
- 100% Telegram API coverage (it grows incrementally)
- Zero bugs (we publish known issues in `docs/PROOF_LAYER.md`)
- Guaranteed five-nines uptime (that's your infrastructure's job)
