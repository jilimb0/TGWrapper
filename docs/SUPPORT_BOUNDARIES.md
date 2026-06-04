# Support Boundaries & Issue Triage

This document defines support limits, issue triage procedures, and supported platforms for users of the TGWrapper library.

---

## 🧭 1. Support Triage SLA

We classify incoming user issues and discussions into three support tiers:

| Issue Category | Target Review SLA | Actions / Policy |
| :--- | :--- | :--- |
| **Critical Bugs** | **Within 24 Hours** | Handlers failure, session CAS locks failure, runtime crashes. Verified issues prioritize hotfixes. |
| **General Bugs / Inquiries** | **Within 3 Business Days** | Specific API mismatches, documentation glitches, metrics configuration issues. |
| **Feature Proposals** | **Best Effort** | Reviewed in community planning sessions. Focus is on architectural fit and scale needs. |

---

## 🚫 2. Out of Scope Support

Our maintainer team does **not** provide official support for:

- **Third-Party Integrations:** Debugging your custom database queries, LLM API credentials, or hosting platform network configurations.
- **Custom Adapters:** If you write your own session or rate limiter adapters using non-standard systems, debugging these is your responsibility.
- **Legacy Platforms:** Troubleshooting execution on unsupported runtimes (e.g. Node.js < v18 or deprecated edge runtimes).
- **Hobby Bots Development:** General inquiries about building basic bots (refer to standard tutorials or community channels).
