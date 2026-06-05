# Ideal Customer Profile (ICP) — TGWrapper

> Internal reference doc for maintainers and contributors.

---

## 1. Primary ICP

The highest-value adopter is a **senior engineer or small team** that:

- Has a **live production Telegram bot** (not a toy, not a weekend project).
- Currently runs on **Telegraf, grammY, or python-telegram-bot** and has hit concrete operational pain.
- Has experienced at least one of:
  - Session data silently overwritten under concurrent button taps.
  - Inability to trace a slow downstream call (LLM, payment API) back to the triggering update.
  - Painful rewrites when moving from polling on a VPS to serverless/edge.
- Is **comfortable with TypeScript** (or actively migrating to it).
- Values **observability and reliability** as production requirements, not nice-to-haves.
- Operates at a scale where **distributed state** matters (multiple instances, Redis, rate limiting).

### Why this profile?

This person does not need to be convinced that Telegram bots are worth building. They already know. What they need is a framework that respects production realities — and they will recognize TGWrapper's value proposition immediately because they have lived the problems it solves.

---

## 2. Why This ICP First

| Reason | Detail |
| :--- | :--- |
| **High intrinsic value** | Production operators invest deeply; they contribute issues, benchmarks, and migration guides. |
| **Strongest product–market fit** | TGWrapper's wedge (Redis CAS, edge portability, structured telemetry) maps directly to their pain. |
| **Fastest path to case studies** | A real migration story from Telegraf → TGWrapper carries more weight than any feature table. |
| **Credible word-of-mouth** | Senior engineers' recommendations travel far within their teams and communities. |

---

## 3. Anti-ICP (Do Not Target)

These profiles are explicitly **not** the launch audience. They may adopt later, but optimizing messaging or onboarding for them now is a distraction.

| Profile | Why they are anti-ICP |
| :--- | :--- |
| **Beginners building their first bot** | They need tutorials, not production primitives. Any framework works for them. |
| **Toy / hobby bots** | No scaling, session, or observability needs. TGWrapper adds unnecessary structure. |
| **Non-TypeScript developers** | TGWrapper is TS-first. Recommending it to Python/Go shops creates friction, not adoption. |
| **Teams with no Redis or infra budget** | The distributed layer is TGWrapper's differentiator. Without it, the value gap shrinks. |
| **"Just wrap the API" developers** | They want a thin HTTP client, not a framework. Point them to the raw Telegram Bot API. |

---

## 4. ICP Signals (Identification Checklist)

Use these signals to identify high-fit prospects in communities, GitHub issues, and forums:

- [ ] Mentions **session race conditions** or **state corruption** in a Telegram bot context.
- [ ] Asks about **running multiple bot instances** behind a load balancer.
- [ ] Complains about **lack of tracing / structured logging** in their current framework.
- [ ] Is migrating a bot from **VPS polling to serverless** (Lambda, Workers).
- [ ] Uses terms like: "CAS", "optimistic locking", "distributed rate limiting", "trace context".
- [ ] Has a GitHub profile showing **TypeScript production projects** (not just tutorials).
- [ ] Mentions **grammY middleware limitations** or **Telegraf v3 → v4 migration pain**.
- [ ] Runs bots that handle **payments, KYC, or stateful multi-step flows**.

---

## 5. Messaging Rules

### Lead with pain, not features

```
❌  "TGWrapper has Redis CAS sessions!"
✅  "If concurrent button taps silently overwrite your user's FSM step, that's the exact
    race condition TGWrapper's Redis CAS adapter was built to prevent."
```

### Respect the current stack

```
❌  "grammY can't handle production workloads."
✅  "grammY is excellent for many use cases. TGWrapper is designed specifically for the
    subset of teams that need distributed state and structured telemetry out of the box."
```

### Show code, not adjectives

```
❌  "TGWrapper makes observability effortless."
✅  "Attach telemetry in two lines - every update gets a trace ID, structured log entry,
    and latency metric through the TGWrapper observability package:"
```

```typescript
import { attachBotObservability, MetricsRegistry } from '@tgwrapper/observability';

const registry = new MetricsRegistry();
attachBotObservability(bot, { metrics: registry, serviceName: 'my-bot' });
```

### Never say "easy"

Production infrastructure is not easy. Saying it is undermines credibility with the ICP. Use precise language:

- "Takes under 10 minutes" (measurable)
- "Requires 3 lines of config" (verifiable)
- "No custom middleware needed" (concrete)
