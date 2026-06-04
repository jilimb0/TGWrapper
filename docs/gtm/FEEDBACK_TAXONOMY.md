# User Feedback Taxonomy Guide

To translate community questions, reports, and complaints into systematic codebase enhancements, we use this feedback taxonomy tagging schema.

---

## 🏷️ The Feedback Taxonomy Matrix

| Feedback Tag | Signal Indicators | Primary Actions | Target Resolution |
| :--- | :--- | :--- | :--- |
| **`friction:onboarding`** | "I got stuck on step 2 of the Quick Start," "package installation failed on Node 18." | Simplify the quick-start path; update dependency declarations in starter templates. | Within 48 hours |
| **`friction:migration`** | "My Telegraf scene doesn't compile," "where does `ctx.session` go in TGWrapper?" | Add a translation comparison block in [CODE_COMPARISONS.md](../CODE_COMPARISONS.md). | Within 7 days |
| **`integration:missing`** | "Do you support MongoDB?," "how do I connect this to DynamoDB?" | Map a target plugin RFC outline in [ECOSYSTEM.md](../ECOSYSTEM.md) for community ownership. | Defer to backlog |
| **`trust:governance`** | "Is this project going to be abandoned?," "how do you handle breaking Bot API updates?" | Update [LONGEVITY_AND_COMMITMENTS.md](../LONGEVITY_AND_COMMITMENTS.md) and highlight drift watchdogs. | Immediate doc edit |
| **`ops:reliability`** | "Redis disconnect loop causes bot crash," "how do I configure Sentinels?" | Add an incident scenario resolution recipe to the Operations Runbook. | Next minor patch |

---

## 🛠️ Taxonomy Triage Rules

1. **Review incoming discussions/issues daily.**
2. **Assign the matching labels** (e.g. `friction:onboarding` or `friction:migration`) to group user complaints.
3. **Run a monthly Review Audit:** Analyze tags to determine which docs or packages need refactoring. If `friction:migration` is the highest volume tag, prioritize adding new code comparisons.
