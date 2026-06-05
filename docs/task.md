# Current Task

## Phase

VALIDATE MODE - publish-ready starter packages and platform trust documentation.

## Completed Sub-Tasks

1. Starter packages were renamed into the `@tgwrapper/starter-*` namespace.
2. `@tgwrapper/create` was added as the official one-command scaffolder.
3. Publishable package metadata and release scripts were updated for starters and scaffolder.
4. Claims audit, proof map, compatibility matrix, deployment profiles, platform guarantees, Redis adoption guidance, and observability runtime/stability docs were added.
5. Public claims in root/package README files were softened to evidence-backed wording.
6. Comparison docs were adjusted toward fair, capability-specific positioning.
7. Redis and observability incident guides were added.
8. Canonical demo flows were documented.

## Open Blockers

None for documentation and package publish readiness in this branch.

## Release Notes

Before publishing to npm, run the release verification stack from the repository root:

```bash
pnpm verify:release:ci
pnpm test:published-smoke
```

`test:published-smoke` requires npm registry access and currently validates already-published package versions.
