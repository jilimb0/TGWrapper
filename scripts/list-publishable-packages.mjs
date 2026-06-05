#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { publishablePackages } from './publishable-packages.mjs';

const mode = process.argv[2] ?? '--json';

if (mode === '--dirs') {
  console.log(publishablePackages.map((pkg) => pkg.dir).join('\n'));
} else if (mode === '--names') {
  console.log(publishablePackages.map((pkg) => pkg.name).join('\n'));
} else if (mode === '--metadata') {
  const metadata = publishablePackages.map((pkg) => {
    const manifestPath = pkg.dir === '.' ? 'package.json' : `${pkg.dir}/package.json`;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    return {
      ...pkg,
      file: manifestPath,
      version: manifest.version,
      files: manifest.files,
      exports: manifest.exports,
      bin: manifest.bin,
      publishConfig: manifest.publishConfig
    };
  });
  console.log(JSON.stringify(metadata, null, 2));
} else {
  console.log(JSON.stringify(publishablePackages, null, 2));
}
