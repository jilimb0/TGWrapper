#!/usr/bin/env node
/**
 * ci-publish.mjs
 *
 * Called by changesets/action as the `publish` command.
 * Publishes every package using `npm publish`.
 *
 * Authentication:
 *   - If NPM_TOKEN is set: injected as NPM_CONFIG__AUTHTOKEN.
 *   - If not: npm CLI >= 11.5.1 performs the OIDC Trusted Publishing token
 *     exchange natively. This requires:
 *       1. `id-token: write` permission in the workflow (already set).
 *       2. A Trusted Publisher configured on npmjs.com for each package.
 *     npm detects ACTIONS_ID_TOKEN_REQUEST_URL and handles the exchange.
 *     No manual token exchange is needed or correct here.
 *
 * changesets/action does NOT perform any OIDC exchange — it simply execs
 * this script as-is.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { publishablePackages } from './publishable-packages.mjs';

const hasNpmToken = Boolean(process.env.NPM_TOKEN);
const hasOidc =
  Boolean(process.env.ACTIONS_ID_TOKEN_REQUEST_URL) &&
  Boolean(process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN);

if (hasNpmToken) {
  console.log('[ci-publish] Using NPM_TOKEN.');
} else if (hasOidc) {
  console.log(
    '[ci-publish] No NPM_TOKEN found, but OIDC is available - using npm trusted publishing',
  );
  console.log(
    '[ci-publish] npm CLI will perform the OIDC token exchange natively (requires npm >= 11.5.1 and a Trusted Publisher configured on npmjs.com).',
  );
} else {
  console.error(
    '[ci-publish] ERROR: No NPM_TOKEN and no OIDC context. Cannot publish.',
  );
  process.exit(1);
}

const libraries = publishablePackages.filter((p) => p.kind === 'library');
const rest = publishablePackages.filter((p) => p.kind !== 'library');

function publishPackage(pkg) {
  const manifestPath =
    pkg.dir === '.' ? 'package.json' : `${pkg.dir}/package.json`;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const { name, version } = manifest;

  try {
    const remote = execFileSync(
      'npm',
      ['view', `${name}@${version}`, 'version'],
      {
        encoding: 'utf8',
        env: process.env,
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    ).trim();
    if (remote === version) {
      console.log(`⏭  ${name}@${version} already on npm — skipping.`);
      return;
    }
  } catch {
    // not published yet
  }

  console.log(`📦 Publishing ${name}@${version}…`);

  const publishEnv = {
    ...process.env,
    // Disable provenance — the repo is private so npm would reject it.
    NPM_CONFIG_PROVENANCE: 'false',
  };
  if (hasNpmToken) {
    publishEnv.NPM_CONFIG__AUTHTOKEN = process.env.NPM_TOKEN;
  }
  // When using OIDC: no token injection needed. npm CLI reads
  // ACTIONS_ID_TOKEN_REQUEST_URL + ACTIONS_ID_TOKEN_REQUEST_TOKEN from the
  // environment and performs the token exchange internally.

  execFileSync('npm', ['publish', '--access', 'public'], {
    cwd:
      pkg.dir === '.'
        ? process.cwd()
        : `${process.cwd()}/${pkg.dir}`,
    env: publishEnv,
    stdio: 'inherit',
  });
  console.log(`✅ ${name}@${version} published.`);
}

for (const pkg of libraries) {
  publishPackage(pkg);
}
for (const pkg of rest) {
  publishPackage(pkg);
}
