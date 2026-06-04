# Dependency & Release Security Policy

This document defines the governance rules, vulnerability vetting guidelines, and risk classification metrics for adding and updating dependencies inside the TGWrapper repository.

---

## 📦 1. Dependency Acquisition Policy

Every new runtime dependency added to any package in the repository must be explicitly vetted against the following criteria:

- **Minimal Footprint:** Avoid adding helper utility libraries (e.g. `lodash`, `ramda`) where standard JavaScript built-in options are sufficient.
- **License Integrity:** Only dependencies with permissive OSS licenses (e.g., MIT, Apache 2.0, BSD) are accepted. GPL or copyleft licenses are strictly blocked.
- **Bundle Impact:** Run build budget audits post-acquisition to verify edge runtime footprint is maintained.

---

## 🔒 2. Vulnerability Auditing & Scanning

- **Automated Check Audits:** Dependabot and CodeQL run checks on every pull request to identify supply-chain risks.
- **Remediation SLA:**
  - **Critical Severity:** Patched within **48 hours** of confirmation.
  - **High Severity:** Patched within **5 days**.
  - **Moderate/Low Severity:** Resolved on the next standard release window.
- **Local Auditing:** Prior to submitting release candidates, the maintainer must run:
  ```bash
  pnpm audit
  ```

---

## 🛡️ 3. Risk Classifications

We classify dependencies into distinct risk tiers to guide update review priority:

| Risk Tier | Scope / Example | Review Requirements |
| :--- | :--- | :--- |
| **High Risk** | State store drivers (`ioredis`), networking adapters. | Requires manual concurrency tests, security review, and performance checks. |
| **Medium Risk** | CLI tooling, test suites (`vitest`), developer dependencies. | Standard automated checks pass; review focuses on build/test times impact. |
| **Low Risk** | Types definitions (`@types/node`). | Automatic merge permitted if unit checks pass. |
