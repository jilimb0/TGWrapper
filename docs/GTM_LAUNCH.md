# Launch Sequence — TGWrapper GTM

> Internal reference doc for the launch phase.

---

## Overview

This is a six-week launch plan. The goal is not maximum reach — it is maximum signal from the right people. Every week has a clear deliverable and a gate that must pass before moving forward.

```
Week 0–1: Messaging prep  →  Week 2: Soft launch  →  Week 3–4: Public launch  →  Week 5–6: Iteration
```

---

## Week 0–1: Messaging Prep

**Objective:** Lock down messaging, assets, and outreach materials before talking to anyone.

### Checklist

- [ ] `ICP.md` reviewed and finalized by all maintainers.
- [ ] README quick start verified: clone → install → run < 5 minutes on a clean machine.
- [ ] Three migration guides validated end-to-end:
  - [ ] [`MIGRATION_FROM_TELEGRAF.md`](./MIGRATION_FROM_TELEGRAF.md)
  - [ ] [`MIGRATION_FROM_GRMMY.md`](./MIGRATION_FROM_GRMMY.md)
  - [ ] [`MIGRATION_FROM_NODE_TELEGRAM_BOT_API.md`](./MIGRATION_FROM_NODE_TELEGRAM_BOT_API.md)
- [ ] `COMPARISON.md` reviewed for accuracy and tone (respectful, evidence-backed).
- [ ] Example apps (`polling-starter`, `multi-instance-redis-starter`, `serverless-webhook-starter`) boot cleanly on latest published npm version.
- [ ] Proof layer passes: `pnpm test && pnpm benchmark && pnpm telegram:baseline:check`.

### Validation Gate

> **Do not proceed to Week 2 unless:** One person who has never seen TGWrapper can go from README to a running polling bot in under 10 minutes, and from there to a Redis-backed multi-instance setup in under 20 minutes. Time it. If it takes longer, fix the docs first.

---

## Week 2: Soft Launch (Design Partners)

**Objective:** Get TGWrapper into the hands of 5–10 high-fit engineers. Collect friction reports, not praise.

### Who to reach out to

- Engineers you've seen asking about **session races**, **distributed bot state**, or **Telegram + serverless** in:
  - grammY GitHub Discussions
  - Telegraf issue tracker
  - r/Telegram, r/node, Telegram dev communities
  - TypeScript / serverless Discord servers
- **Do not cold-DM.** Respond to existing pain-related threads with a genuine answer and a link.

### Outreach template

```
Hey [name] — I saw your thread about [specific pain point, e.g. "session overwrites
when running two bot instances"]. We ran into the same thing and built a Redis CAS
session adapter specifically for this case.

The framework is called TGWrapper. It's TypeScript-first, runs on Node / Workers / Lambda,
and has built-in distributed state + structured telemetry.

If you're interested in trying it, I'd be happy to:
- Walk through the migration from [their current framework]
- Pair on the Redis adapter setup
- Collect your honest feedback on what's confusing or broken

No pressure either way. Here's the repo: [link]
```

### What to offer design partners

| Offer | Purpose |
| :--- | :--- |
| **1:1 migration pairing** (30 min call or async chat) | Surfaces real friction that docs miss |
| **Priority issue response** (< 24h) | Builds trust and loyalty |
| **Named credit** in `FIELD_NOTES.md` (if they consent) | Recognition creates advocates |
| **Direct Slack/Discord channel** for early adopters | Fast feedback loop |

### What to collect

- Time-to-first-bot (minutes)
- Time-to-Redis-session (minutes)
- Every point where they got confused, stuck, or had to read source code
- Whether they would recommend TGWrapper to a colleague (yes/no + why)

---

## Week 3–4: Public Launch

**Objective:** Publish to broader channels. Convert design-partner feedback into polished assets.

### Assets to publish before launch

- [ ] **Blog post / dev.to article:** "Why We Built TGWrapper" — problem-first narrative, not feature list.
- [ ] **Hacker News / Reddit post:** Short, honest, technical. Link to repo + comparison matrix.
- [ ] **Twitter/X thread:** 5–7 tweets. Hook = pain point. Body = code snippet. CTA = repo link.
- [ ] **GitHub README** updated with any design-partner feedback incorporated.
- [ ] **FIELD_NOTES.md** updated with at least 2 real migration stories (anonymized if needed).

### Channels (in priority order)

1. **Hacker News** — "Show HN: TGWrapper — TypeScript Telegram framework for distributed bots"
2. **r/node**, **r/typescript** — Technical post, no hype
3. **dev.to / Hashnode** — Longer-form migration walkthrough
4. **Telegram developer communities** — Respond to pain threads, link to comparison
5. **Twitter/X** — Thread with code snippets

### Post format rules

- **Title must name the pain**, not the product: "How we stopped session races in our Telegram bot" > "Introducing TGWrapper"
- **First paragraph = problem.** No throat-clearing, no "we're excited to announce."
- **Include a runnable code block** in the first scroll. If someone can't see code without scrolling, rewrite.
- **End with an honest caveat.** State what's not ready yet. This builds trust with the ICP.

Example closing:

```
TGWrapper is at v0.15 — the core API is stable, but the observability package is still
in beta. We're looking for teams running production Telegram bots who want structured
telemetry and are willing to give feedback on the trace schema. If that's you, open an
issue or reach out.
```

---

## Week 5–6: Iteration

**Objective:** Close the feedback loop. Fix what's broken. Double down on what resonates.

### Feedback triage

| Signal | Action |
| :--- | :--- |
| "I got stuck at step X" | Fix the doc / error message within 48h. |
| "I wish it had Y" | Add to `ROADMAP.md` if it fits the doctrine; explain why not if it doesn't. |
| "The comparison is unfair to Z" | Review and correct. Credibility > winning an argument. |
| "I migrated from Telegraf and it took N hours" | Document the migration in `FIELD_NOTES.md`. Ask for permission to quote. |
| Radio silence after install | Follow up once. Ask what blocked them. Then let it go. |

### Friction fixes (prioritize these)

1. Any step in the Quick Start that takes > 2 minutes.
2. Any error message that doesn't tell you what to do next.
3. Any migration guide that skips a step.
4. Any example app that doesn't boot on first try.

### Consider for Week 6+

- **`create-tgwrapper` CLI scaffolding tool** — if multiple design partners say "I wish there was a starter template."
- **Video walkthrough** (5 min) — only if written docs prove insufficient for the ICP.
- **Discord / community channel** — only if there are 10+ active adopters requesting it.

---

## Success Metrics (End of Week 6)

| Metric | Target |
| :--- | :--- |
| Design partners who completed migration | ≥ 3 of 5–10 |
| GitHub stars | Not a target (vanity metric) |
| Open issues from external users | ≥ 5 (signal of real usage) |
| Time-to-first-bot (median) | < 10 minutes |
| "Would you recommend?" from design partners | ≥ 60% yes |
| Migration stories in `FIELD_NOTES.md` | ≥ 2 |
