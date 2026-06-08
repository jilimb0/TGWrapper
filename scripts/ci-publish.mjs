#!/usr/bin/env node
/**
 * ci-publish.mjs
 *
 * Called by changesets/action as the `publish` command.
 * Publishes every package in publishablePackages using `npm publish`
 * (not pnpm) so that OIDC Trusted Publishing on npmjs.com works correctly.
 *
 * pnpm has its own OIDC token-exchange path that fails with 404 on npmjs.com.
 * npm natively supports Trusted Publishing via the ACTIONS_ID_TOKEN_REQUEST_URL
 * environment variable that GitHub Actions exposes when id-token: write is set.
 *
 * Starters (kind=starter) may still contain workspace:^ deps at publish time
 * if changesets/action didn't bump them. They are published last, after
 * libraries are live, so npm can resolve the deps from the registry.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { publishablePackages } from './publishable-packages.mjs';

const libraries = publishablePackages.filter((p) => p.kind === 'library');
const rest = publishablePackages.filter((p) => p.kind !== 'library');

function publishPackage(pkg) {
  const manifestPath = pkg.dir === '.' ? 'package.json' : `${pkg.dir}/package.json`;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const { name, version } = manifest;

  // Check if already published — changesets/action calls this script even
  // when there's nothing new to publish (version PR mode). Skip gracefully.
  try {
    const remote = execFileSync('npm', ['view', `${name}@${version}`, 'version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (remote === version) {
      console.log(`⏭  ${name}@${version} already on npm — skipping.`);
      return;
    }
  } catch {
    // Not published yet — proceed.
  }

  console.log(`📦 Publishing ${name}@${version}…`);
  execFileSync(
    'npm',
    ['publish', '--access', 'public'],
    { cwd: pkg.dir === '.' ? process.cwd() : `${process.cwd()}/${pkg.dir}`, stdio: 'inherit' },
  );
  console.log(`✅ ${name}@${version} published.`);
}

// Publish libraries first so starters can resolve their deps.
for (const pkg of libraries) {
  publishPackage(pkg);
}
for (const pkg of rest) {
  publishPackage(pkg);
}
