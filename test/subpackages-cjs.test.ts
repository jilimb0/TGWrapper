import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);

const subpackages = [
  'packages/adapter-redis',
  'packages/observability',
  'packages/adapter-dynamodb',
  'packages/adapter-mongodb',
];

describe('Subpackage CommonJS builds (#214)', () => {
  for (const relPath of subpackages) {
    it(`${relPath} emits dist-cjs/package.json and loads cleanly via require()`, () => {
      const pkgDir = resolve(repoRoot, relPath);
      const pkgJson = JSON.parse(readFileSync(resolve(pkgDir, 'package.json'), 'utf8')) as {
        files?: string[];
        scripts?: Record<string, string>;
      };

      expect(pkgJson.files).toContain('dist-cjs/**/*');
      const buildCjsScript = pkgJson.scripts?.['build:cjs'] ?? '';
      expect(buildCjsScript).toContain('dist-cjs/package.json');

      const binPath = [
        resolve(pkgDir, 'node_modules/.bin'),
        resolve(repoRoot, 'node_modules/.bin'),
        process.env.PATH ?? '',
      ]
        .filter(Boolean)
        .join(':');

      execSync(buildCjsScript, {
        cwd: pkgDir,
        env: { ...process.env, PATH: binPath },
        stdio: 'pipe',
      });

      const cjsPkgPath = resolve(pkgDir, 'dist-cjs/package.json');
      expect(existsSync(cjsPkgPath)).toBe(true);
      expect(JSON.parse(readFileSync(cjsPkgPath, 'utf8'))).toEqual({ type: 'commonjs' });

      const cjsEntry = resolve(pkgDir, 'dist-cjs/index.js');
      delete require.cache[cjsEntry];
      const mod = require(cjsEntry) as Record<string, unknown>;
      expect(typeof mod).toBe('object');
      expect(Object.keys(mod).length).toBeGreaterThan(0);
    }, 30_000);
  }
});
