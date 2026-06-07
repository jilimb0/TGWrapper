#!/usr/bin/env node
/**
 * Pre-commit hook:
 *   1. If any package.json is staged, runs `pnpm install --no-frozen-lockfile`.
 *   2. If pnpm-lock.yaml changed after install, stages it automatically.
 *   3. If install exits non-zero, aborts the commit with a clear error.
 *
 * This ensures the lockfile is always in sync and broken installs are
 * caught before they reach CI.
 */
import { execSync, spawnSync } from 'node:child_process';

const root = process.cwd();

function exec(cmd, opts = {}) {
  return execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
}

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

// Collect staged files
const stagedFiles = exec('git diff --cached --name-only --diff-filter=ACMR').split('\n').filter(Boolean);
const hasPackageJson = stagedFiles.some((f) => f.endsWith('package.json'));

if (!hasPackageJson) {
  console.log('✓ pre-commit checks passed (no package.json changes)');
  process.exit(0);
}

console.log('📦 package.json changed — running pnpm install...');

const result = spawnSync('pnpm', ['install', '--no-frozen-lockfile'], {
  cwd: root,
  stdio: 'inherit',
  encoding: 'utf8',
});

if (result.status !== 0) {
  fail('pnpm install failed. Fix the errors above before committing.');
}

// Check if lockfile changed and stage it automatically
const lockfileChanged = exec('git diff --name-only pnpm-lock.yaml').includes('pnpm-lock.yaml');
if (lockfileChanged) {
  console.log('🔒 pnpm-lock.yaml updated — staging automatically...');
  exec('git add pnpm-lock.yaml');
}

console.log('✓ pre-commit checks passed');
