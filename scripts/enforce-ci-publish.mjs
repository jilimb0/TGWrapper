const isCi = process.env.CI === 'true' || process.env.CI === '1';
const fromChangesets = process.env.CHANGESETS_RELEASE === 'true' || process.env.CHANGESETS_RELEASE === '1';

if (!isCi || !fromChangesets) {
  console.error('Manual publish is blocked. Releases must run via CI Changesets workflow.');
  process.exit(1);
}

// For OIDC (Trusted Publishing) flow: verify that the GitHub Actions OIDC
// token endpoint is available. This is set by GitHub when id-token: write
// permission is granted. Its presence means npm can exchange it for a
// short-lived publish token automatically — no NPM_TOKEN secret needed.
const hasOidc = Boolean(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
// Also accept classic token-based auth (NODE_AUTH_TOKEN set by setup-node
// with registry-url, or NPM_TOKEN set explicitly as a secret).
const hasToken = Boolean(process.env.NODE_AUTH_TOKEN || process.env.NPM_TOKEN);

if (!hasOidc && !hasToken) {
  console.error(
    '[enforce-ci-publish] ERROR: No npm auth available.\n' +
    'Expected either:\n' +
    '  - OIDC Trusted Publishing: ACTIONS_ID_TOKEN_REQUEST_URL must be set\n' +
    '    (requires id-token: write permission in the workflow job)\n' +
    '    and a Trusted Publisher configured on npmjs.com:\n' +
    '      Organization/user: jilimb0\n' +
    '      Repository: TGWrapper\n' +
    '      Workflow filename: release.yml\n' +
    '  - Classic token: NODE_AUTH_TOKEN or NPM_TOKEN secret must be set\n' +
    'Aborting to prevent a silent no-op publish.'
  );
  process.exit(1);
}

if (hasOidc) {
  console.log('[enforce-ci-publish] OIDC Trusted Publishing context detected — proceeding.');
} else {
  console.log('[enforce-ci-publish] Classic npm token detected — proceeding.');
}
