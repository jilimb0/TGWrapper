# Release Hardening & Drift Prevention Checklist

This document defines the strict quality verification workflow executed for every release of TGWrapper, alongside prevention policies to avoid drift between implementation code, telemetry contracts, support matrices, and upstream Telegram API schemas.

---

## 🚀 1. Pre-Release Hardening Checklist

Execute these validation gates on a dedicated release branch before tagging a build:

### Quality & Builds
- [ ] **Clean Build:** Run `pnpm build` and verify zero TypeScript compilation warnings or package dependency resolution errors.
- [ ] **Tests Verification:** Run `pnpm test` and verify that all 57+ unit, integration, and load benchmark tests pass.
- [ ] **Clean Lint & Format:** Run `pnpm lint` and formatting commands to verify code styling standards are met.
- [ ] **Security Scans:** Ensure there are no high-severity vulnerabilities flagged in `pnpm audit` or Dependabot alerts.

### Artifacts & Changesets
- [ ] **Changesets Check:** Verify a corresponding changesets entry exists for every user-facing change using `pnpm changeset status`.
- [ ] **Clean Version Bump:** Execute `pnpm changeset version` locally to inspect generated version increments and lockfile updates.

### Examples Verification
- [ ] **Starter Checks:** Perform a fresh clone of the 5 canonical starters (`polling-starter`, `multi-instance-redis-starter`, `serverless-webhook-starter`, `ai-bot-starter`, `moderation-bot`) and confirm that `pnpm install` and compilation execute without errors.

---

## 🛡️ 2. Drift Prevention Policies

To prevent our documentation, compatibility matrix, and upstream schemas from desynchronizing as the codebase evolves, enforce the following reviews:

### upstream API Schema Drift
- **Mechanism:** Upstream Telegram API changes are caught by the weekly baseline check script (`pnpm telegram:baseline:check`).
- **Policy:** If the schema checks report a type mismatch or missing fields:
  1. The API wrapper generation script must be re-run on a separate branch.
  2. Types must be updated, and any breaking client changes must be cataloged in `docs/TELEGRAM_API_COMPATIBILITY.md`.

### Telemetry Schema Drift
- **Mechanism:** Observability structures are declared as a formal contract in `docs/TELEMETRY_SCHEMA.md`.
- **Policy:** Any pull request modifying logger events, metric registries, or span attributes in `@tgwrapper/observability` **must** include matching updates to the [Telemetry Schema Contract](./TELEMETRY_SCHEMA.md). Release validation fails if telemetry code additions are missing documentation changes.

### Support Matrix Drift
- **Mechanism:** The runtime environments support matrix is defined in `SUPPORT.md`.
- **Policy:** If dependencies (e.g., `ioredis` version support bounds or Node engine minimum versions) are modified inside `package.json` configurations, the release auditor must explicitly update [SUPPORT.md](../SUPPORT.md) to reflect the new boundaries.
