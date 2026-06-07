import { spawnSync } from 'node:child_process';

const steps = [
  'pnpm changeset:lint',
  'pnpm telegram:baseline:check',
  'pnpm telegram:schema:types:check',
  'pnpm telegram:schema:payloads:check',
  'pnpm telegram:schema:results:check',
  'pnpm test',
  'pnpm typecheck:compat',
  'pnpm -r typecheck',
  'pnpm build',
  'pnpm -r --filter=!./examples/** build',
  'pnpm api:snapshot:check',
  'pnpm pack:size',
  // In CI examples use workspace:^ (not yet published), so skip dep version checks.
  // Locally pack:starters enforces exact published versions before tagging.
  process.env.GITHUB_ACTIONS === 'true' ? 'pnpm pack:starters:ci' : 'pnpm pack:starters'
];

for (const step of steps) {
  console.log(`\n==> ${step}`);
  const result = spawnSync(step, {
    shell: true,
    stdio: 'inherit',
    env: process.env
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
