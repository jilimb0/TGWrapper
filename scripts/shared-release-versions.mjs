import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const config = JSON.parse(
  readFileSync(new URL('./release-versions.json', import.meta.url), 'utf8'),
);

export const publishedVersions = config.publishedVersions;

export function getPublishedVersion(packageName) {
  return publishedVersions[packageName];
}

export function getPublishedVersionWithoutRange(packageName) {
  const value = getPublishedVersion(packageName);
  return typeof value === 'string' ? value.replace(/^\^/, '') : value;
}

export function getLatestNpmVersion(packageName) {
  const version = execSync(`npm view ${packageName} version --json`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim().replace(/"/g, '');

  if (!version) {
    throw new Error(`Empty npm version for ${packageName}`);
  }

  return version;
}

export function getLatestNpmVersionWithRange(packageName) {
  return `^${getLatestNpmVersion(packageName)}`;
}
