#!/usr/bin/env node
/**
 * ci-publish.mjs
 *
 * Called by changesets/action as the `publish` command.
 * Publishes every package using `npm publish`.
 *
 * When NPM_TOKEN is absent but OIDC is available (id-token: write permission),
 * this script performs the Trusted Publishing OIDC token exchange itself:
 *   1. Requests an OIDC JWT from the GitHub Actions token endpoint
 *      (ACTIONS_ID_TOKEN_REQUEST_URL + ACTIONS_ID_TOKEN_REQUEST_TOKEN)
 *   2. POSTs it to https://registry.npmjs.org/-/oauth/token to obtain
 *      a bearer access token
 *   3. Injects that token as NPM_CONFIG__AUTHTOKEN into the child npm process
 *
 * changesets/action only execs this script — it does NOT perform any
 * OIDC exchange on our behalf.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { publishablePackages } from './publishable-packages.mjs';

/**
 * Exchange GitHub Actions OIDC JWT for an npm Trusted Publishing token.
 * Returns the bearer token string, or throws if exchange fails.
 */
async function getOidcToken() {
  const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;

  if (!requestUrl || !requestToken) {
    throw new Error(
      'OIDC env vars missing: ACTIONS_ID_TOKEN_REQUEST_URL / ACTIONS_ID_TOKEN_REQUEST_TOKEN',
    );
  }

  // Step 1: get the OIDC JWT from GitHub Actions, scoped to npm
  const oidcUrl = `${requestUrl}&audience=https://registry.npmjs.org/`;
  const oidcRes = await fetch(oidcUrl, {
    headers: { Authorization: `bearer ${requestToken}` },
  });
  if (!oidcRes.ok) {
    const body = await oidcRes.text();
    throw new Error(`Failed to obtain OIDC JWT (${oidcRes.status}): ${body}`);
  }
  const { value: jwt } = await oidcRes.json();

  // Step 2: exchange JWT for npm bearer token
  const exchangeRes = await fetch('https://registry.npmjs.org/-/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oidc: jwt }),
  });
  if (!exchangeRes.ok) {
    const body = await exchangeRes.text();
    throw new Error(`npm OIDC token exchange failed (${exchangeRes.status}): ${body}`);
  }
  const { token } = await exchangeRes.json();
  return token;
}

async function resolveNpmToken() {
  if (process.env.NPM_TOKEN) {
    console.log('[ci-publish] Using NPM_TOKEN.');
    return process.env.NPM_TOKEN;
  }

  const hasOidc =
    process.env.ACTIONS_ID_TOKEN_REQUEST_URL &&
    process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;

  if (hasOidc) {
    console.log('[ci-publish] No NPM_TOKEN found, but OIDC is available - using npm trusted publishing');
    return await getOidcToken();
  }

  throw new Error(
    '[ci-publish] No NPM_TOKEN and no OIDC context. Cannot publish.',
  );
}

const npmToken = await resolveNpmToken();

const libraries = publishablePackages.filter((p) => p.kind === 'library');
const rest = publishablePackages.filter((p) => p.kind !== 'library');

function publishPackage(pkg) {
  const manifestPath = pkg.dir === '.' ? 'package.json' : `${pkg.dir}/package.json`;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const { name, version } = manifest;

  try {
    const remote = execFileSync('npm', ['view', `${name}@${version}`, 'version'], {
      encoding: 'utf8',
      env: process.env,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (remote === version) {
      console.log(`⏭  ${name}@${version} already on npm — skipping.`);
      return;
    }
  } catch {
    // not published yet
  }

  console.log(`📦 Publishing ${name}@${version}…`);
  execFileSync(
    'npm',
    ['publish', '--access', 'public'],
    {
      cwd: pkg.dir === '.' ? process.cwd() : `${process.cwd()}/${pkg.dir}`,
      env: {
        ...process.env,
        // Inject the resolved token (either NPM_TOKEN or OIDC-exchanged)
        // as the auth token npm reads for the registry.
        NPM_CONFIG__AUTHTOKEN: npmToken,
      },
      stdio: 'inherit',
    },
  );
  console.log(`✅ ${name}@${version} published.`);
}

for (const pkg of libraries) {
  publishPackage(pkg);
}
for (const pkg of rest) {
  publishPackage(pkg);
}
