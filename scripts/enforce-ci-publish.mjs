const isCi = process.env.CI === 'true' || process.env.CI === '1';
const fromChangesets = process.env.CHANGESETS_RELEASE === 'true' || process.env.CHANGESETS_RELEASE === '1';

if (!isCi || !fromChangesets) {
  console.error('Manual publish is blocked. Releases must run via CI Changesets workflow.');
  process.exit(1);
}
