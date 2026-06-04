#!/usr/bin/env node
/**
 * Syncs @jilimb0/* dependency versions in examples/ to match
 * the current versions declared in each package's own package.json.
 *
 * Run after every release / changeset version bump:
 *   node scripts/sync-examples.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { readdirSync, statSync } from 'fs';

const root = new URL('..', import.meta.url).pathname;

// Collect canonical versions for all @jilimb0/* packages
const packageDirs = collectPackageDirs(join(root, 'packages'));
const canonicalVersions = {};

for (const dir of packageDirs) {
  const pkgPath = join(dir, 'package.json');
  const pkg = readJSON(pkgPath);
  if (pkg.name?.startsWith('@jilimb0/')) {
    canonicalVersions[pkg.name] = pkg.version;
  }
}

// Root package (tgwrapper lives at root)
const rootPkg = readJSON(join(root, 'package.json'));
if (rootPkg.name?.startsWith('@jilimb0/')) {
  canonicalVersions[rootPkg.name] = rootPkg.version;
}

console.log('Canonical versions:', canonicalVersions);

// Update examples
const examplesDir = join(root, 'examples');
const examples = readdirSync(examplesDir).filter(d =>
  statSync(join(examplesDir, d)).isDirectory()
);

let anyChanged = false;

for (const example of examples) {
  const pkgPath = join(examplesDir, example, 'package.json');
  let pkg;
  try {
    pkg = readJSON(pkgPath);
  } catch {
    continue;
  }

  let changed = false;
  for (const depField of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (!pkg[depField]) continue;
    for (const [name, range] of Object.entries(pkg[depField])) {
      if (!canonicalVersions[name]) continue;
      const canonical = `^${canonicalVersions[name]}`;
      if (range !== canonical) {
        console.log(`  ${example}: ${name} ${range} → ${canonical}`);
        pkg[depField][name] = canonical;
        changed = true;
        anyChanged = true;
      }
    }
  }

  if (changed) {
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }
}

if (!anyChanged) {
  console.log('All examples already in sync.');
}

function readJSON(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

function collectPackageDirs(dir) {
  try {
    return readdirSync(dir)
      .map(d => join(dir, d))
      .filter(d => statSync(d).isDirectory());
  } catch {
    return [];
  }
}
