#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { getLatestNpmVersion } from './shared-release-versions.mjs';

const trackedPackages = [
  '@tgwrapper/core',
  '@tgwrapper/adapter-redis',
  '@tgwrapper/observability',
  '@tgwrapper/starter-migration',
  '@tgwrapper/starter-standard-bot',
  '@tgwrapper/starter-support-bot',
  '@tgwrapper/create'
];

const configPath = new URL('./release-versions.json', import.meta.url);
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const nextPublishedVersions = {};

for (const packageName of trackedPackages) {
  const latest = getLatestNpmVersion(packageName);
  nextPublishedVersions[packageName] = `^${latest}`;
}

writeFileSync(
  configPath,
  `${JSON.stringify({ ...config, publishedVersions: nextPublishedVersions }, null, 2)}\n`
);

console.log('✓ scripts/release-versions.json synced to npm latest for tracked packages');
