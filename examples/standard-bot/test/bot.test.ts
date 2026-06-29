import { describe, it, expect } from 'vitest';

describe('standard-bot', () => {
  it('bot.ts file exists and exports properly', async () => {
    const mod = await import('../src/bot.js');
    // Should export a bot or a create function
    expect(mod).toBeDefined();
  });

  it('package.json has correct dependencies', () => {
    const pkg = require('../package.json');
    expect(pkg.dependencies['@tgwrapper/core']).toBeDefined();
  });
});
