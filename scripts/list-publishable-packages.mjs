#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { publishablePackages } from './publishable-packages.mjs';

const mode = process.argv[2] ?? '--json';

// Optional --kind <kind> filters (repeatable, e.g. --kind library --kind scaffolder)
const kindArgs = [];
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--kind' && process.argv[i + 1]) {
    kindArgs.push(process.argv[++i]);
  }
}
const packages = kindArgs.length
  ? publishablePackages.filter((p) => kindArgs.includes(p.kind))
  : publishablePackages;

if (mode === '--dirs') {
  console.log(packages.filter(p => p.dir).map((pkg) => pkg.dir).join('\n'));
} else if (mode === '--names') {
  console.log(packages.map((pkg) => pkg.name).join('\n'));
} else if (mode === '--metadata') {
  const metadata = packages.map((pkg) => {
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
  console.log(JSON.stringify(packages, null, 2));
}
