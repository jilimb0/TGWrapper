#!/usr/bin/env node
/**
 * Syncs @jilimb0/* dependency versions in examples/ to the latest
 * PUBLISHED versions on npm (not local package.json versions).
 *
 * Run after every release:
 *   node scripts/sync-examples.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { readdirSync, statSync } from 'fs';
import { execSync } from 'child_process';

const root = new URL('..', import.meta.url).pathname;

// Collect all @jilimb0/* package names from workspace
const packageDirs = collectPackageDirs(join(root, 'packages'));
const packageNames = [];

for (const dir of packageDirs) {
  const pkg = readJSON(join(dir, 'package.json'));
  if (pkg.name?.startsWith('@jilimb0/')) packageNames.push(pkg.name);
}
// Root package
const rootPkg = readJSON(join(root, 'package.json'));
if (rootPkg.name?.startsWith('@jilimb0/')) packageNames.push(rootPkg.name);

// Fetch latest PUBLISHED version from npm for each package
const publishedVersions = {};
for (const name of packageNames) {
  try {
    const version = execSync(`npm view ${name} version --json`, { stdio: ['pipe', 'pipe', 'pipe'] })
      .toString().trim().replace(/"/g, '');
    publishedVersions[name] = version;
    console.log(`  ${name}: published=${version}`);
  } catch {
    console.warn(`  ${name}: not found on npm, skipping`);
  }
}

console.log('\nPublished versions:', publishedVersions);

// Update examples
const examplesDir = join(root, 'examples');
const examples = readdirSync(examplesDir).filter(d =>
  statSync(join(examplesDir, d)).isDirectory()
);

let anyChanged = false;

for (const example of examples) {
  const pkgPath = join(examplesDir, example, 'package.json');
  let pkg;
  try { pkg = readJSON(pkgPath); } catch { continue; }

  let changed = false;
  for (const depField of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (!pkg[depField]) continue;
    for (const [name, range] of Object.entries(pkg[depField])) {
      if (!publishedVersions[name]) continue;
      const canonical = `^${publishedVersions[name]}`;
      if (range !== canonical) {
        console.log(`  ${example}: ${name} ${range} → ${canonical}`);
        pkg[depField][name] = canonical;
        changed = true;
        anyChanged = true;
      }
    }
  }

  if (changed) writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

if (!anyChanged) console.log('All examples already in sync.');

function readJSON(p) { return JSON.parse(readFileSync(p, 'utf8')); }

function collectPackageDirs(dir) {
  try {
    return readdirSync(dir)
      .map(d => join(dir, d))
      .filter(d => statSync(d).isDirectory());
  } catch { return []; }
}
