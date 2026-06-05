#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const packages = [
  '@tgwrapper/core',
  '@tgwrapper/adapter-redis',
  '@tgwrapper/observability',
  '@tgwrapper/starter-migration',
  '@tgwrapper/starter-standard-bot',
  '@tgwrapper/starter-support-bot',
  '@tgwrapper/create'
];

const config = JSON.parse(
  readFileSync(new URL('./release-versions.json', import.meta.url), 'utf8')
);

const configuredVersions = config.publishedVersions ?? {};
const viewOutput = execFileSync(
  'npm',
  ['view', ...packages, 'version', '--json'],
  {
    encoding: 'utf8',
    timeout: 20_000,
    stdio: ['ignore', 'pipe', 'pipe']
  }
).trim();

const latestVersions = parseVersions(viewOutput);
const mismatches = [];

for (const packageName of packages) {
  const configured = stripRange(configuredVersions[packageName]);
  const latest = latestVersions[packageName];

  if (!configured) {
    mismatches.push(`${packageName}: missing in release-versions.json`);
    continue;
  }

  if (!latest) {
    mismatches.push(`${packageName}: npm latest version not found`);
    continue;
  }

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

function stripRange(value) {
  return typeof value === 'string' ? value.replace(/^\^/, '') : undefined;
}

function parseVersions(json) {
  const parsed = JSON.parse(json);
  if (Array.isArray(parsed)) {
    if (parsed.every((item) => typeof item === 'string')) {
      return Object.fromEntries(parsed.map((version, index) => [packages[index], version]));
    }

    if (parsed.every((item) => item && typeof item === 'object')) {
      const entries = parsed
        .map((item) => [item.name, item.version])
        .filter(([name, version]) => typeof name === 'string' && typeof version === 'string');
      return Object.fromEntries(entries);
    }
  }

  if (parsed && typeof parsed === 'object') {
    return Object.fromEntries(
      Object.entries(parsed).filter(([, version]) => typeof version === 'string')
    );
  }

  throw new Error('Unexpected npm view response format');
}
