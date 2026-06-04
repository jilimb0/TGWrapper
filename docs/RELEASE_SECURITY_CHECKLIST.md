# Release Security Checklist

This checklist defines the security verification checkpoints executed during release validation.

---

## 🔒 Security Gate Checkpoints

Execute these checks on the release branch before initiating final publication actions:

### 1. Secrets Verification
- [ ] Run automated scans (e.g. `gitleaks` or git secret search patterns) to verify no credentials, API keys (such as `BOT_TOKEN` or `OPENAI_API_KEY`), or private certificates are checked into codebase files.
- [ ] Confirm `.env.example` configurations contain placeholder strings only.

### 2. GitHub Actions Workflow Review
- [ ] Inspect any changes to `.github/workflows/` files.
- [ ] Verify that OIDC configuration scopes (`id-token: write`) are restricted exclusively to official publication triggers.
- [ ] Ensure actions dependencies specify exact commit hashes rather than mutable tags (e.g. `actions/checkout@v4` pinned to SHA).

### 3. Dependency Diff Audit
- [ ] Execute `pnpm audit` and confirm zero critical or high vulnerabilities are present.
- [ ] Run a git diff check on `package.json` to verify no unvetted packages have been introduced.

### 4. Examples Sanity Validation
- [ ] Walk through all starters (`polling-starter`, `ai-bot-starter`, etc.) to verify mock credentials do not match active production keys.
- [ ] Confirm build tasks execute within isolated sandbox scopes.
