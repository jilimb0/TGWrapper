#!/usr/bin/env node
/**
 * Syncs @jilimb0/* dependency versions in examples/.
 *
 * Two modes:
 *   --local   Use versions from local package.json files (for version-bump PR,
 *             before packages are published to npm)
 *   (default) Fetch latest PUBLISHED versions from npm (for post-publish sync)
 *
 * Usage:
 *   node scripts/sync-examples.mjs          # post-publish: from npm
 *   node scripts/sync-examples.mjs --local  # pre-publish: from local files
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { readdirSync, statSync } from 'fs';
import { execSync } from 'child_process';

const root = new URL('..', import.meta.url).pathname;
const useLocal = process.argv.includes('--local');

// Collect all @jilimb0/* package names from workspace
const packageDirs = collectPackageDirs(join(root, 'packages'));
const packageNames = [];

for (const dir of packageDirs) {
  const pkg = readJSON(join(dir, 'package.json'));
  if (pkg.name?.startsWith('@jilimb0/')) packageNames.push({ name: pkg.name, dir });
}
const rootPkg = readJSON(join(root, 'package.json'));
if (rootPkg.name?.startsWith('@jilimb0/')) packageNames.push({ name: rootPkg.name, dir: root });

// Resolve versions
const resolvedVersions = {};

if (useLocal) {
  console.log('Mode: local (reading from package.json files)');
  for (const { name, dir } of packageNames) {
    const pkg = readJSON(join(dir, 'package.json'));
    resolvedVersions[name] = pkg.version;
    console.log(`  ${name}: local=${pkg.version}`);
  }
} else {
  console.log('Mode: npm (fetching published versions)');
  for (const { name } of packageNames) {
    try {
      const version = execSync(`npm view ${name} version --json`, { stdio: ['pipe', 'pipe', 'pipe'] })
        .toString().trim().replace(/"/g, '');
      resolvedVersions[name] = version;
      console.log(`  ${name}: published=${version}`);
    } catch {
      console.warn(`  ${name}: not found on npm, skipping`);
    }
  }
}

console.log('\nResolved versions:', resolvedVersions);

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
      if (!resolvedVersions[name]) continue;
      const canonical = `^${resolvedVersions[name]}`;
      if (range !== canonical) {
        console.log(`  ${example}: ${name} ${range} \u2192 ${canonical}`);
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
