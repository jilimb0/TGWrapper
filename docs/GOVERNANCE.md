# Governance Model

This document outlines the decision-making processes, contribution rules, codebase ownership, and feature prioritization guidelines for the TGWrapper project.

---

## 🏛️ 1. Decision Making & Roles

- **Core Maintainers:** A small team of active contributors holding write access to the main repository. Maintainers are responsible for PR reviews, release tagging, and security incident resolution.
- **RFC Process:** Significant architectural changes (such as introducing new storage adapters or modifying runtime wrappers) must be proposed via an Request for Comments (RFC) issue before implementation starts.

---

## 🛠️ 2. Prioritization Framework

We evaluate feature requests against four primary criteria:

1. **Architectural Alignment:** Does the feature align with the core project goals (distributed scale, type safety, low cold-start edge)?
2. **Operations Overhead:** Does the addition introduce complex configurations or maintainer burdens?
3. **DX Focus:** Does the API maintain clarity and portability?
4. **Security Risk:** Does the change expose tokens, sessions, or rate limiters to risks?

---

## 🤝 3. Contributions Policy

All contributions are subject to:
- **Code Review:** Every PR requires approval from at least one core maintainer.
- **Type Compliance:** PR builds must pass strict TypeScript compiler checks without using `any` overrides on core code paths.
- **Telemetry Checks:** Changes changing metrics or logger events must include matching updates inside telemetry contracts.
