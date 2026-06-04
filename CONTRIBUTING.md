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
- **Drift Prevention Gate:** If you make changes to the telemetry system (`@tgwrapper/observability`), you must update the schema contracts inside `docs/TELEMETRY_SCHEMA.md` within the same pull request.
- **Dual module Delivery:** Code changes must not break CommonJS (CJS) or ES Modules (ESM) dual packaging bundles. Verify by running `pnpm build`.
- **Changesets Integration:** All PRs containing code changes must run `pnpm changeset` to add a description of the changes.

---

## 🔀 Pull Request Workflow

1. **Check Open Issues:** Before implementing a major change, open a GitHub Discussion or Issue to align on the technical design.
2. **Branch Naming:** Use descriptive branch prefixes:
   - `feat/` for new capabilities (e.g. `feat/mongo-adapter`)
   - `fix/` for bug fixes
   - `docs/` for documentation updates
3. **Submit Draft PR:** Feel free to open a Draft PR early to get feedback on code structure.
4. **Code Quality Checks:** Make sure `pnpm lint` and `pnpm test` run clean locally.

---

## 🧪 Testing Guidelines

TGWrapper relies on high-coverage integration and simulation testing:
- **Unit & Integration Tests:** Written using [Vitest](https://vitest.dev/). Place tests adjacent to the source code file (e.g. `router.test.ts` next to `router.ts`).
- **Mocking Telegram API:** Do not hit live Telegram endpoints in unit tests. Use the mocked context wrappers provided in the test harness.
- **FSM/Fuzz Testing:** For session adapters, implement state mutation simulations to verify CAS edge cases (network splits, latency lag).

---

## 🔌 Adapter & Plugin Contributions

We encourage community adapters!
- **Where to place:** Submit new adapters under the `packages/` directory (e.g. `packages/adapter-mongodb`).
- **Consistency:** Ensure custom session stores implement the `SessionAdapter` interface exported by `@tgwrapper/core`.
- **Documentation:** Provide an example usage section and README inside your adapter directory.

---

## 🐣 Beginner-Friendly Task Pathways

If you are contributing to TGWrapper for the first time, look for issues labeled:
- **`good-first-issue`**: Minor type adjustments, doc updates, or adding tests.
- **`documentation`**: Correcting errors or expanding comparisons.
- **`adapter-contributions`**: Building out DynamoDB or PostgreSQL session store templates.

Maintainers promise feedback on all community PR submissions within **48 hours**. Feel free to join the Discussions boards to ask questions!

