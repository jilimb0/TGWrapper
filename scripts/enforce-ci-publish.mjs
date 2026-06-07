const isCi = process.env.CI === 'true' || process.env.CI === '1';
const fromChangesets = process.env.CHANGESETS_RELEASE === 'true' || process.env.CHANGESETS_RELEASE === '1';

if (!isCi || !fromChangesets) {
  console.error('Manual publish is blocked. Releases must run via CI Changesets workflow.');
  process.exit(1);
}

// Ensure OIDC token exchange succeeded — pnpm sets NPM_TOKEN on success.
// If it's absent, the publish would silently dry-run and nothing lands on npm.
const hasNpmToken = Boolean(process.env.NPM_TOKEN);

if (!hasNpmToken) {
  console.error(
    '[enforce-ci-publish] ERROR: NPM_TOKEN is not set.\n' +
    'OIDC token exchange with npmjs.com failed (likely ERR_PNPM_AUTH_TOKEN_EXCHANGE).\n' +
    'Check that the Trusted Publisher on npmjs.com is configured correctly:\n' +
    '  - Organization/user: jilimb0\n' +
    '  - Repository: TGWrapper\n' +
    '  - Workflow filename: release.yml\n' +
    '  - Environment name matches the one declared in the release job (if any)\n' +
    'Aborting to prevent a silent dry-run from leaving bumped package.json versions unpublished.'
  );
  process.exit(1);
}

console.log('[enforce-ci-publish] OIDC token exchange verified — NPM_TOKEN is present. Proceeding with publish.');
