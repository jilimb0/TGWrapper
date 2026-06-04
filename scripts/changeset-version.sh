#!/usr/bin/env bash
set -euo pipefail
pnpm changeset version
node scripts/sync-examples.mjs --local
pnpm install --no-frozen-lockfile
