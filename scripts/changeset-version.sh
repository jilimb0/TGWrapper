#!/usr/bin/env bash
set -euo pipefail
# Run changeset version bump
pnpm changeset version
# Keep internal example dependencies on workspace protocol during the release PR flow.
# The changeset version branch is created before publishing, so replacing workspace:*
# with npm ranges for @tgwrapper/* causes pnpm install to fetch packages that do not
# exist in the registry yet.
# Sync example package.json files only after publish in the dedicated published-version flow.
pnpm install --no-frozen-lockfile
