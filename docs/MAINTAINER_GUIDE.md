# Maintainer Operations Guide

This guide defines the workflows, rules, and procedures for project maintainers contributing to and release-packaging the TGWrapper library.

---

## 🚀 1. Release Delivery Flow

We automate our version release and package publication pipelines using GitHub Actions and Changesets:

```
  [Developer Branch] ──> PR with Changeset ──> [Merge to Main]
                                                    │
                                         [GitHub Action Action runs]
                                                    │
                                         ( Auto-creates PR: Version Bump )
                                                    │
                                         [Merge Version Bump PR]
                                                    │
                                         ( OIDC Tokenless Publication )
```

### Steps to Release:
1. **Changeset Addition:** Every pull request changing core code must include a changeset file. Generate it by running:
   ```bash
   pnpm changeset
   ```
   Select package version increments (major, minor, patch) and provide a summary of changes.
2. **Review & Merge:** Once the PR is merged to `main`, our release Action automatically generates a Version Bump PR.
3. **Publication:** Merging the Version Bump PR triggers OIDC tokenless publishing to npm.

---

## 🛡️ 2. Quality Safeguards

Maintainers must enforce the following validation checks prior to merging code changes:

- **Build verification:** Running `pnpm build` must succeed without warnings.
- **Test execution:** Ensure no unit, integration, or load chaos tests fail.
- **Drift watchdog check:** Verify that automated API schema checks do not report drift.
- **Example verification:** Confirm that example starters compile and run without exceptions.
