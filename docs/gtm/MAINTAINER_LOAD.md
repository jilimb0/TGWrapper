# Maintainer Load & Automation Model

This document maps out maintainer load allocations, automated workflows, and community delegation gates to ensure the long-term sustainability of the project.

---

## ⚖️ Time & Resource Allocation

Maintainer duties are divided into three areas:

```
[ Core Development: 40% ] ──> Core engine, type contracts, performance optimizations
[ Community Support: 30% ] ──> Triage discussions, PR reviews, onboarding assistance
[ Automation & CI:  30% ] ──> Running drift baseline watchdogs, release validation
```

---

## 🤖 Automation Candidates & Current Status

We protect maintainer time by automating repetitive maintenance chores:

| Chore Category | Status | Implementation Details |
| :--- | :--- | :--- |
| **API Drift Verification** | `Automated` | Weekly cron job runs `pnpm telegram:baseline:check` against the latest Telegram schema releases. |
| **Release Bundling** | `Automated` | GitHub Actions run standard Vitest tests, compile ESM/CJS, and publish changesets. |
| **Issue Triage Routing** | `Semi-Automated` | Issue templates route reports to `migration-help` or `bug` labels automatically. |

---

## 🤝 Community Delegation Gates

To prevent maintainer burnout as adoption grows, we delegate specific tasks to advocates and contributors:

### 1. Second-Tier Q&A
First-tier onboarding issues (e.g. configuring environments, npm version resolution) are routed to GitHub Discussions for community advocates to answer. Core maintainers only step in for unresolved bugs.

### 2. Third-Party Database Adapters
All adapters beyond the official Redis Adapter (such as MongoDB, DynamoDB, or PostgreSQL session stores) are delegated to community ownership. They are built and published as standalone npm packages under community scopes.
