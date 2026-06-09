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
 *       3. NPM_CONFIG_PROVENANCE=true  ← REQUIRED: npm only activates the
 *          OIDC path when provenance is enabled. Without it npm falls back
 *          to the classic _authToken path and returns ENEEDAUTH.
 *     npm detects ACTIONS_ID_TOKEN_REQUEST_URL and handles the exchange.
 *     No manual token exchange is needed or correct here.
 *
 * changesets/action does NOT perform any OIDC exchange — it simply execs
 * this script as-is.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
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

/**
 * Resolve the published version for a workspace package name.
 * Libraries (published earlier in the same run) are looked up from the
 * in-memory `publishedVersions` map that we build as we go, so that a
 * starter that depends on a library published moments ago gets the right
 * version even before scripts/release-versions.json is updated.
 */
const publishedVersions = {};

/**
 * Before calling `npm publish`, rewrite every `workspace:*` / `workspace:^`
 * entry in the package's dependencies/peerDependencies/optionalDependencies
 * to its real semver range.
 *
 * npm does not understand pnpm's workspace protocol and would publish the
 * literal string "workspace:^", making the package uninstallable by consumers
 * who use plain npm.
 *
 * Returns the original manifest text so the caller can restore it after
 * publishing (keeping the repo source files unchanged).
 */
function rewriteWorkspaceDeps(manifestPath) {
  const original = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(original);

  const depFields = ['dependencies', 'peerDependencies', 'optionalDependencies'];
  let changed = false;

  for (const field of depFields) {
    if (!manifest[field]) continue;
    for (const [dep, range] of Object.entries(manifest[field])) {
      if (!String(range).startsWith('workspace:')) continue;

      // Prefer the in-memory map (libraries published this run), then fall
      // back to scripts/release-versions.json which was written by the
      // changeset-version step.
      const resolved =
        publishedVersions[dep] ??
        (() => {
          try {
            const rv = JSON.parse(
              readFileSync(
                new URL('../scripts/release-versions.json', import.meta.url),
                'utf8',
              ),
            );
            return rv.publishedVersions?.[dep];
          } catch {
            return undefined;
          }
        })();

      if (!resolved) {
        // Fall back to the exact version recorded in the published package's
        // own package.json (available after the library is published).
        const fallback = execFileSync(
          'npm',
          ['view', dep, 'version'],
          { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: process.env },
        ).trim();
        manifest[field][dep] = `^${fallback}`;
      } else {
        manifest[field][dep] = resolved;
      }

      changed = true;
      console.log(
        `  workspace-rewrite: ${dep}: "${range}" → "${manifest[field][dep]}"`,
      );
    }
  }

  if (changed) {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  }

  return original; // caller restores this after publish
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
      // Still record the version so starters that depend on this library
      // can resolve workspace:^ even when the library was pre-published.
      publishedVersions[name] = `^${version}`;
      return;
    }
  } catch {
    // not published yet
  }

  console.log(`📦 Publishing ${name}@${version}…`);

  // Rewrite workspace:^ → real semver in the manifest before publishing.
  // npm does not understand the workspace: protocol and would emit it
  // verbatim into the tarball's package.json, breaking consumers.
  const originalManifest = rewriteWorkspaceDeps(manifestPath);

  const publishEnv = {
    ...process.env,
    // REQUIRED for OIDC Trusted Publishing: npm only activates the OIDC
    // token-exchange path when provenance is enabled. With provenance=false
    // npm skips OIDC entirely and falls back to _authToken → ENEEDAUTH.
    NPM_CONFIG_PROVENANCE: 'true',
  };
  if (hasNpmToken) {
    publishEnv.NPM_CONFIG__AUTHTOKEN = process.env.NPM_TOKEN;
    // When using a static token, provenance can be disabled.
    publishEnv.NPM_CONFIG_PROVENANCE = 'false';
  }
  // When using OIDC: no token injection needed. npm CLI reads
  // ACTIONS_ID_TOKEN_REQUEST_URL + ACTIONS_ID_TOKEN_REQUEST_TOKEN from the
  // environment and performs the token exchange internally.

  try {
    execFileSync('npm', ['publish', '--access', 'public'], {
      cwd:
        pkg.dir === '.'
          ? process.cwd()
          : `${process.cwd()}/${pkg.dir}`,
      env: publishEnv,
      stdio: 'inherit',
    });
    console.log(`✅ ${name}@${version} published.`);
    publishedVersions[name] = `^${version}`;
  } finally {
    // Always restore the source manifest — whether publish succeeded or failed.
    writeFileSync(manifestPath, originalManifest, 'utf8');
  }
}

for (const pkg of libraries) {
  publishPackage(pkg);
}
for (const pkg of rest) {
  publishPackage(pkg);
}
