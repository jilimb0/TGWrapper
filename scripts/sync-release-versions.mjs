#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const releaseVersionsUrl = new URL('./release-versions.json', import.meta.url);
const packages = [
  ['@tgwrapper/core', new URL('../package.json', import.meta.url)],
  ['@tgwrapper/adapter-redis', new URL('../packages/adapter-redis/package.json', import.meta.url)],
  ['@tgwrapper/observability', new URL('../packages/observability/package.json', import.meta.url)],
];

const config = JSON.parse(readFileSync(releaseVersionsUrl, 'utf8'));
config.publishedVersions ??= {};

let changed = false;

for (const [expectedName, packageUrl] of packages) {
  const pkg = JSON.parse(readFileSync(packageUrl, 'utf8'));

  if (pkg.name !== expectedName) {
    throw new Error(`Expected ${expectedName} in ${packageUrl.pathname}, found ${pkg.name}`);
  }

  const nextVersion = `^${pkg.version}`;
  if (config.publishedVersions[pkg.name] !== nextVersion) {
    console.log(`${pkg.name}: ${config.publishedVersions[pkg.name] ?? '<missing>'} -> ${nextVersion}`);
    config.publishedVersions[pkg.name] = nextVersion;
    changed = true;
  }
}

if (!changed) {
  console.log('release-versions.json already in sync.');
  process.exit(0);
}

writeFileSync(releaseVersionsUrl, `${JSON.stringify(config, null, 2)}\n`);
console.log('Updated scripts/release-versions.json');
