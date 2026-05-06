# Execution Plan to 0.11.0

## North Star
Make TGWrapper the default choice for teams building production Telegram bots in TypeScript.

## Workstreams

### WS1 Productized Onboarding
- [x] Canonical starters: polling, serverless webhook, AI starter.
- [ ] Add one-command run instructions in README and docs index.
- [ ] Add starter smoke-check commands.

### WS2 Migration and Positioning
- [x] Migration guides: Telegraf, grammY, raw API.
- [x] Why TGWrapper page.
- [x] Comparison page.
- [ ] Add direct links in README top section.

### WS3 Production Trust
- [x] License + OSS policy files.
- [x] Workflow least-privilege and trusted-context hardening.
- [x] TS6 compatibility stabilization.
- [ ] Reconfirm zero open high-severity owned-code alerts after re-scan.

### WS4 Release Excellence
- [x] Changeset present for release.
- [ ] Ensure required checks are minimal and non-duplicated.
- [ ] Publish final 0.11.0 notes and checklist.

## Definition of Ready for 0.11.0
- `pnpm verify:release` green on main.
- Required checks green on PR merge path.
- Starter kits run from clean clone.
- Security alerts triaged and release risk accepted.
