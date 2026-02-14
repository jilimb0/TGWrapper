import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(process.cwd());
const currentPath = resolve(repoRoot, 'dist/index.d.ts');
const snapshotPath = resolve(repoRoot, 'docs/api-snapshots/tgwrapper-index.d.ts');

copyFileSync(currentPath, snapshotPath);
console.log(`Updated API snapshot: ${snapshotPath}`);
