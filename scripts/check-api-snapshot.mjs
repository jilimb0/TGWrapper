import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = resolve(process.cwd());
const currentPath = resolve(repoRoot, 'dist/index.d.ts');
const snapshotPath = resolve(repoRoot, 'docs/api-snapshots/tgwrapper-index.d.ts');

function normalize(content) {
  return content.replace(/\r\n/g, '\n').trim();
}

if (!existsSync(currentPath)) {
  const build = spawnSync('pnpm', ['build:esm'], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });

  if (build.status !== 0 || !existsSync(currentPath)) {
    console.error('Failed to generate dist/index.d.ts before snapshot check.');
    process.exit(build.status ?? 1);
  }
}

const current = normalize(readFileSync(currentPath, 'utf8'));
const snapshot = normalize(readFileSync(snapshotPath, 'utf8'));

if (current !== snapshot) {
  console.error('API snapshot mismatch detected.');
  console.error(`Current:  ${currentPath}`);
  console.error(`Snapshot: ${snapshotPath}`);
  console.error('If the change is intended for 0.5.0, update snapshot with: pnpm api:snapshot:update');
  process.exit(1);
}

console.log('API snapshot is up to date.');
