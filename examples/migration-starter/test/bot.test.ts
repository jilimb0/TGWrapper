import { describe, it, expect } from 'vitest';

describe('migration-starter', () => {
  it('bot.ts (after migration) exists', async () => {
    const mod = await import('../src/bot-after.js');
    expect(mod).toBeDefined();
  });

  it('has both before and after migration files', async () => {
    const before = await import('../src/bot-before.js');
    const after = await import('../src/bot-after.js');
    expect(before).toBeDefined();
    expect(after).toBeDefined();
  });

  it('package.json has correct dependencies', () => {
    const pkg = require('../package.json');
    expect(pkg.dependencies['@tgwrapper/core']).toBeDefined();
  });
});
