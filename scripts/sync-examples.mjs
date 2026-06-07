#!/usr/bin/env node
/**
 * Syncs organization-scoped TGWrapper dependency versions in examples/.
 *
 * Two modes:
 *   --local      Use versions from local package.json files (for version-bump PR,
 *                before packages are published to npm)
 *   (default)    Use scripts/release-versions.json as the published source of truth
 *   --from-npm   Fetch latest published versions from npm directly
 *
 * Usage:
 *   node scripts/sync-examples.mjs
 *   node scripts/sync-examples.mjs --local
 *   node scripts/sync-examples.mjs --from-npm
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  getLatestNpmVersion,
  getPublishedVersionWithoutRange,
} from './shared-release-versions.mjs';

const root = new URL('..', import.meta.url).pathname;
const useLocal = process.argv.includes('--local');
const useNpm = process.argv.includes('--from-npm');

const packageDirs = [
  ...collectPackageDirs(join(root, 'packages')),
  ...collectPackageDirs(join(root, 'examples')),
];
const packageNames = [];

for (const dir of packageDirs) {
  const pkg = readJSON(join(dir, 'package.json'));
  if (pkg.name?.startsWith('@tgwrapper/') || pkg.name?.startsWith('@jilimb0/')) packageNames.push({ name: pkg.name, dir });
}
const rootPkg = readJSON(join(root, 'package.json'));
if (rootPkg.name?.startsWith('@tgwrapper/') || rootPkg.name?.startsWith('@jilimb0/')) packageNames.push({ name: rootPkg.name, dir: root });

const resolvedVersions = {};

if (useLocal) {
  console.log('Mode: local (reading from package.json files)');
  for (const { name, dir } of packageNames) {
    const pkg = readJSON(join(dir, 'package.json'));
    resolvedVersions[name] = pkg.version;
    console.log(`  ${name}: local=${pkg.version}`);
  }
} else if (useNpm) {
  console.log('Mode: npm (fetching latest published versions)');
  for (const { name } of packageNames) {
    try {
      const version = getLatestNpmVersion(name);
      resolvedVersions[name] = version;
      console.log(`  ${name}: published=${version}`);
    } catch {
      console.warn(`  ${name}: not found on npm, skipping`);
    }
  }
} else {
  console.log('Mode: published config (reading from scripts/release-versions.json)');
  for (const { name } of packageNames) {
    const version = getPublishedVersionWithoutRange(name);
    if (!version) {
      console.warn(`  ${name}: not configured in release-versions.json, skipping`);
      continue;
    }
    resolvedVersions[name] = version;
    console.log(`  ${name}: published=${version}`);
  }
}

console.log('\nResolved versions:', resolvedVersions);

const examplesDir = join(root, 'examples');
const examples = readdirSync(examplesDir).filter((d) => statSync(join(examplesDir, d)).isDirectory());

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
      if (!resolvedVersions[name]) continue;
      // In local mode use workspace:^ so CI never hits npm for unpublished versions.
      // In published mode (default/--from-npm) use ^version for the released PR.
      const canonical = useLocal ? 'workspace:^' : `^${resolvedVersions[name]}`;
      if (range !== canonical) {
        console.log(`  ${example}: ${name} ${range} → ${canonical}`);
        pkg[depField][name] = canonical;
        changed = true;
        anyChanged = true;
      }
    }
  }

  if (changed) {
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  }
}

if (!anyChanged) {
  console.log('All examples already in sync.');
}

function readJSON(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function collectPackageDirs(dir) {
  try {
    return readdirSync(dir)
      .map((d) => join(dir, d))
      .filter((d) => statSync(d).isDirectory());
  } catch {
    return [];
  }
}
