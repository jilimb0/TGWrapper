#!/usr/bin/env node
import { getPublishedVersionWithoutRange, getLatestNpmVersion } from './shared-release-versions.mjs';

const packages = [
  '@jilimb0/tgwrapper',
  '@jilimb0/tgwrapper-adapter-redis',
  '@jilimb0/tgwrapper-observability',
];

const mismatches = [];

for (const packageName of packages) {
  const configured = getPublishedVersionWithoutRange(packageName);
  const latest = getLatestNpmVersion(packageName);

  if (configured !== latest) {
    mismatches.push(`${packageName}: release-versions.json=${configured}, npm latest=${latest}`);
  }
}

if (mismatches.length > 0) {
  console.error('\n❌ release-versions.json is out of sync with npm latest:\n');
  for (const mismatch of mismatches) {
    console.error(`- ${mismatch}`);
  }
  console.error('\nUpdate scripts/release-versions.json to match the published versions.\n');
  process.exit(1);
}

console.log('✓ release-versions.json matches npm latest');
