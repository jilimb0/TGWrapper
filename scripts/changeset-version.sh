#!/usr/bin/env bash
set -euo pipefail
# Run changeset version bump
pnpm changeset version
# Sync example package.json files to new local versions (pre-publish, no install)
node scripts/sync-examples.mjs --local
