# Adoption Funnel — From Awareness to Advocacy

> Internal reference for maintainers.

---

## Overview

Every adoption follows the same five layers. Most open-source projects lose people between Interest and Trial. This doc defines what we do at each layer to reduce that drop-off — and what we deliberately do not do.

```
  Awareness  →  Interest  →  Trial  →  Adoption  →  Advocacy
     ↓             ↓           ↓           ↓            ↓
  "Heard of it"  "Looks     "Tried it"  "Shipped    "Told
                  relevant"              with it"    others"
```

---

## 1. Awareness — "I've heard of TGWrapper"

**Goal:** Appear where the ICP already searches for solutions to problems TGWrapper solves.

### Keywords and topics to own

- `telegram bot session race condition`
- `telegram bot multiple instances redis`
- `telegram bot structured logging tracing`
- `telegraf vs grammy production`
- `telegram bot serverless cloudflare workers`
- `telegram bot typescript framework`

### Content strategy

| Format | Example | Channel |
| :--- | :--- | :--- |
| **Pain-first answer** | Reply to "my sessions get overwritten" with CAS explanation + link | GitHub Discussions, Reddit, Stack Overflow |
| **Comparison article** | "TGWrapper vs grammY vs Telegraf — when to use which" | dev.to, blog |
| **Migration walkthrough** | "Moving a 50k-user bot from Telegraf to TGWrapper" | dev.to, Hacker News |
| **SEO-optimized README** | Decision matrix, proof snapshot, quick start | GitHub |

### What we do NOT do at this layer

- Pay for ads or sponsorships.
- Spam Telegram groups with promotional messages.
- Claim TGWrapper is "better" without evidence.

---

## 2. Interest — "This might solve my problem"

**Goal:** Convert "heard of it" into "I should look at this seriously."

### Triggers (what moves someone from Awareness → Interest)

- They see a **code snippet** that addresses their exact pain point.
- They find a **comparison table** that honestly positions TGWrapper relative to their current tool.
- They read a **migration story** from someone in a similar situation.

### Assets that must exist

| Asset | Location | Validates |
| :--- | :--- | :--- |
| Quick Decision Matrix | `README.md` | "Is this for my use case?" |
| Comparison Matrix | `docs/COMPARISON.md` | "How does it compare to what I use?" |
| Migration Guides | `docs/MIGRATION_FROM_*.md` | "Can I actually switch?" |
| Proof Snapshot | `README.md` | "Is this tested and maintained?" |
| "Do not choose TGWrapper if…" | `README.md` | "Are they honest about limitations?" |

### Anti-pattern

Never hide limitations. The ICP is a senior engineer — they will find the gaps anyway. Stating them upfront builds the trust that converts Interest into Trial.

---

## 3. Trial — "Let me try it"

**Goal:** First running bot in under 10 minutes. No environment yak-shaving.

### The 10-minute trial path

```bash
# Step 1: Install (30 seconds)
pnpm add @tgwrapper/core

# Step 2: Create bot (2 minutes)
```

```typescript
import { createBotClient } from '@tgwrapper/core';

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'polling' });
bot.on('message', async (msg) => {
  if ('text' in msg) await bot.sendMessage(msg.chat.id, `Echo: ${msg.text}`);
});
await bot.start();
```

```bash
# Step 3: Run (30 seconds)
BOT_TOKEN=<your-token> npx tsx bot.ts
```

### Friction killers

| Friction point | Mitigation |
| :--- | :--- |
| "I need to set up a full project" | Single-file example. No build step required with `tsx`. |
| "I don't have a bot token" | Link to `@BotFather` in Quick Start with exact steps. |
| "The types are confusing" | Zero `any` on the critical path — autocomplete guides the user. |
| "I don't know what `mode` to choose" | Default to `polling`. Explain webhook as the production upgrade path. |
| "Error messages are cryptic" | Every error includes what went wrong + what to do next. |

### Trial success signal

The trial succeeds when the user sends `/start` to their bot and gets a response. If they reach this point, the framework has earned the right to ask for more time.

---

## 4. Adoption — "I'm building with it"

**Goal:** Support the transition from "tried it" to "shipped production code on it."

### What drives adoption

| Driver | How TGWrapper delivers |
| :--- | :--- |
| **Migration is not a rewrite** | Migration guides map concepts 1:1 where possible (e.g., `bot.on` → `bot.on`). |
| **Progressive complexity** | Start with polling, add Redis when needed, switch to webhook when ready. See `ADOPTION_PATH.md`. |
| **Production confidence** | Proof layer, benchmark budgets, failure drills — verifiable before going live. |
| **Escape hatches exist** | Raw Telegram API access is always available. No lock-in to TGWrapper abstractions. |

### Support at this layer

- **Fast issue response** (< 48h for adopter-reported bugs).
- **Migration pairing** for design partners (see `GTM_LAUNCH.md`).
- **Production Checklist** (`docs/PRODUCTION_CHECKLIST.md`) as a pre-deploy confidence gate.
- **Operations Runbook** (`docs/OPERATIONS_RUNBOOK.md`) for incident response.

### Adoption failure signals

Watch for these — they indicate the funnel is leaking:

- User opens an issue, gets no response for a week → they leave.
- User tries Redis adapter, hits an undocumented config requirement → they revert.
- User reads migration guide, finds a step missing → they give up.

---

## 5. Advocacy — "I told my team about it"

**Goal:** Turn adopters into people who recommend TGWrapper without being asked.

### What creates advocates

Advocates are not created by features. They are created by **experiences**:

- A migration that went smoother than expected.
- A bug report that was fixed in 24 hours.
- A production incident where TGWrapper's telemetry saved debugging time.
- Documentation that answered the question before they had to ask.

### Enable sharing

| Enable | How |
| :--- | :--- |
| **Quotable results** | "Migrated from Telegraf in 3 hours. Session races gone." — give them the data to say this. |
| **Shareable assets** | Comparison tables, architecture diagrams, code snippets — all embeddable. |
| **FIELD_NOTES.md** | Publish real stories (with permission). Others see themselves in those stories. |
| **GitHub Discussions** | A place for adopters to help each other — reduces maintainer load, builds community. |

### Recognition

- Credit contributors and design partners by name in `FIELD_NOTES.md` and `CHANGELOG.md`.
- Highlight community-contributed migration guides or plugins in the README.
- Never take credit for an adopter's work. Amplify their voice instead.

### What we do NOT do

- Ask for testimonials before the user has shipped to production.
- Create referral programs or gamification — this is an engineering tool, not a consumer app.
- Pressure anyone to write blog posts. If they want to, provide a template and review it.
