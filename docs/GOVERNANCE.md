# TGWrapper Governance Model

This document establishes the project governance structure, decision-making processes, contribution rules, codebase ownership, and conflict resolution paths.

---

## 🏛️ 1. Project Roles

To maintain high architectural standards, we divide responsibility into three roles:

- **Users:** Anyone building with TGWrapper. Users are encouraged to report bugs, request features, and participate in Q&A discussions.
- **Contributors:** Developers submitting code changes, adapters, or documentation updates. Contributors must follow the guidelines in `CONTRIBUTING.md`.
- **Core Maintainers:** Active developers with write access to the main repository. Maintainers are responsible for reviewing pull requests, managing releases, and safeguarding the framework doctrine.

---

## 🛠️ 2. Decision-Making & RFC Process

Decisions are classified by scope:

### Minor Decisions (PR Level)
Changes such as type adjustments, minor optimization fixes, or documentation corrections are handled by standard PR reviews. Every PR requires approval from at least **one core maintainer** before merging.

### Major Decisions (RFC Level)
Significant design shifts—such as core schema rewrites, modifications to update router behaviors, or introducing new official modules—must go through an Request for Comments (RFC) process:
1. **Submit RFC:** Open a design draft issue detailing the proposed API changes, migration paths, and runtime impacts.
2. **Review Window:** Allow a 7-day review window for community feedback.
3. **Consensus:** A core maintainer must sign off on the RFC before code development begins.

---

## 🛡️ 3. Breaking-Change Governance

Breaking changes are handled strictly to prevent disrupting production deployments:
- **Semantic Versioning (SemVer):** Breaking core API changes are compiled only into Major releases (e.g. `1.0.0` → `2.0.0`).
- **Deprecation Cycle:** Deprecated features must trigger console warnings for at least one minor release cycle before removal.
- **Migration Blueprint:** Every breaking change must ship with a corresponding update blueprint and migration scripts where possible.

---

## 🚢 4. Release Ownership

- **Release Manager:** Maintainers rotate the Release Manager role for minor and major versions.
- **Release Verification:** Before release, the manager must verify:
  - 100% test coverage status on CI.
  - ESM and CJS bundle integrity checks.
  - Baseline drift watchdog validations against official Telegram Bot API types.

---

## ⚖️ 5. Conflict Resolution Path

In the event of a disagreement regarding technical designs or RFC paths:
1. **Technical Consensus:** Seek consensus through open discussion on the issue thread.
2. **Doctrine Alignment Audit:** Evaluate the options against the core directives in `docs/DOCTRINE.md` (e.g. low footprint, zero default overhead, multi-instance safety).
3. **Maintainer Voting:** If consensus is not reached, active core maintainers will hold a majority vote to decide the outcome.
