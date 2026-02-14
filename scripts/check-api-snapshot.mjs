import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(process.cwd());
const currentPath = resolve(repoRoot, 'dist/index.d.ts');
const snapshotPath = resolve(repoRoot, 'docs/api-snapshots/tgwrapper-index.d.ts');

function normalize(content) {
  return content.replace(/\r\n/g, '\n').trim();
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
