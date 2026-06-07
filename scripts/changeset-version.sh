#!/usr/bin/env bash
set -euo pipefail
# Run changeset version bump
pnpm changeset version
# Sync examples to bumped local versions so they land in the same Version PR
# and CI can install them before publish happens.
node scripts/sync-examples.mjs --local
