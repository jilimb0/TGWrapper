#!/usr/bin/env bash
set -euo pipefail
# Run changeset version bump
pnpm changeset version
# Sync example package.json files to new local versions (pre-publish, no install)
node scripts/sync-examples.mjs --local
# Regenerate lockfile so pnpm-lock.yaml stays in sync with bumped package.json files.
# Without this, CI --frozen-lockfile fails on the Version Packages commit.
pnpm install --no-frozen-lockfile
