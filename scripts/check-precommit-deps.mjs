#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { publishedVersions } from './shared-release-versions.mjs';

const root = process.cwd();

function getStagedFiles() {
  const out = execSync('git diff --cached --name-only --diff-filter=ACMR', {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  return out ? out.split('\n').filter(Boolean) : [];
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

const stagedFiles = getStagedFiles();
const stagedSet = new Set(stagedFiles);
const stagedPackageJson = stagedFiles.filter((f) => f.endsWith('package.json'));
const examplePackageJson = stagedPackageJson.filter((f) => /^examples\/[^/]+\/package\.json$/.test(f));

if (stagedPackageJson.length > 0 && !stagedSet.has('pnpm-lock.yaml')) {
  fail([
    'You staged one or more package.json files but pnpm-lock.yaml is not staged.',
    'Run `pnpm install --lockfile-only` or `pnpm install`, then stage pnpm-lock.yaml.',
  ].join(' '));
}

const versionErrors = [];
for (const relPath of examplePackageJson) {
  const absPath = path.join(root, relPath);
  const pkg = readJson(absPath);
  const deps = pkg.dependencies ?? {};

  for (const [name, expected] of Object.entries(publishedVersions)) {
    if (name in deps && deps[name] !== expected) {
      versionErrors.push(`${relPath}: ${name} is ${deps[name]}, expected ${expected}`);
    }
  }
}

if (versionErrors.length > 0) {
  fail([
    'Example packages must reference the latest published package versions.',
    ...versionErrors,
  ].join('\n'));
}

console.log('✓ pre-commit checks passed');
