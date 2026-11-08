import { createRequire, register } from 'node:module';

register(new URL('./typedoc-hooks.mjs', import.meta.url));

// Polyfill Minimatch.prototype.matchOne for minimatch >= 11 compatibility with TypeDoc 0.28
try {
  const require = createRequire(import.meta.url);
  const minimatchCjs = require.resolve('minimatch', { paths: [require.resolve('typedoc')] });
  const minimatchEsm = minimatchCjs.replace('/dist/commonjs/', '/dist/esm/');
  const { Minimatch } = await import('file://' + minimatchEsm);
  if (Minimatch && !Minimatch.prototype.matchOne) {
    Minimatch.prototype.matchOne = function (file, _pattern, partial) {
      const path = Array.isArray(file) ? file.join('/') : file;
      return this.match(path, partial ?? true);
    };
  }
} catch {
  // Ignore if minimatch not found or already compatible
}

