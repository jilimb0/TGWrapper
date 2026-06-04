# Maintainer Support & Triage Guidelines

This document outlines the operational boundaries, response times, and triage workflows for project maintainers and contributors handling community support requests.

---

## 🛡️ Support Boundaries

Maintainer bandwidth is a finite resource. To keep the project sustainable, we maintain strict divisions between **Core Support** (maintainer responsibility) and **Application Support** (community responsibility).

### What Maintainers Support
- **Core Bugs:** Regressions or design bugs in `@tgwrapper/core`, `@tgwrapper/adapter-redis`, and `@tgwrapper/observability`.
- **API Baseline Drift:** Schema updates required due to upstream Telegram Bot API updates.
- **Critical Security Flaws:** Vulnerabilities discovered in dependencies or runtime engines.
- **Edge Deployment Compatibility:** Correct ESM/CJS compilation and edge platform initialization scripts.

### What is Deferred to the Community
- **Custom Logic Implementation:** Writing handler logic or application-specific state machines.
- **Infrastructure Audits:** Debugging connection drops or replication lags in custom Redis/database clusters.
- **Third-Party Libraries Integration:** Helping integrate other libraries (e.g. Prisma, Express, Nest.js) with TGWrapper.

---

## 🚦 Issue Triage Workflow

All incoming GitHub issues must be categorized and marked within **48 hours** using the following label mapping:

| Label | Criteria | Target Resolution |
| :--- | :--- | :--- |
| `bug:core` | Core runtime failures affecting correct execution of valid code. | High Priority (Next patch release) |
| `bug:drift` | Discrepancies between TGWrapper types and upstream Telegram Bot API schemas. | Medium Priority (Within 7 days) |
| `type:feature` | Enhancement requests. | Deferred (Discuss in RFC cycle) |
| `type:question` | Usage questions or support requests. | Move to GitHub Discussions, close issue |

### Handling Questions on Issues
If an issue is opened asking for implementation advice:
1. Reply politely using the canned response below.
2. Convert the issue into a GitHub Discussion under the Q&A category.
3. Close the original issue.

> **Canned Response:**
> *"Thank you for reaching out! To keep our issue tracker focused on core framework bugs, we handle usage and implementation questions in our GitHub Discussions board. I have converted this issue into a Discussion thread here: [Link]. Please follow up in that thread, where the community can help you troubleshoot."*

---

## 📈 Commercial & Premium Support Escalation

For enterprise teams running mission-critical bots:
- Maintainers offer consulting agreements covering codebase migration, architectural reviews, and custom database adapter development.
- For business inquiries, contact the maintainers via the email specified in the repository profile.
