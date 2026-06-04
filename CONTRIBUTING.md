# Contributing to TGWrapper

Thank you for contributing to TGWrapper! To maintain platform reliability, we enforce strict guidelines across testing, telemetry drift prevention, and schema validation.

---

## 🛠️ Local Setup

1. **Clone the Repo & Install Dependencies:**
   ```bash
   git clone https://github.com/jilimb0/TGWrapper.git
   cd TGWrapper
   pnpm install
   ```

2. **Verify Code Verification Budgets:**
   Ensure all baseline tests pass locally before committing:
   ```bash
   pnpm build
   pnpm test
   ```

---

## 📝 Contribution Policies

- **Strict Type Validation:** All variables and parameters must be explicitly typed. No `any` declarations are allowed on the core request path.
- **Drift Prevention Gate:** If you make changes to the telemetry system (`@jilimb0/tgwrapper-observability`), you must update the schema contracts inside `docs/TELEMETRY_SCHEMA.md` within the same pull request.
- **Dual module Delivery:** Code changes must not break CommonJS (CJS) or ES Modules (ESM) dual packaging bundles. Verify by running `pnpm build`.
- **Changesets Integration:** All PRs containing code changes must run `pnpm changeset` to add a description of the changes.
