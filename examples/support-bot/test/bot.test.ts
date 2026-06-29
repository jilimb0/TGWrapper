import { describe, it, expect } from 'vitest';

describe('support-bot', () => {
  it('bot.ts file exists and exports properly', async () => {
    const mod = await import('../src/bot.js');
    expect(mod).toBeDefined();
  });

  it('package.json has correct dependencies', () => {
    const pkg = require('../package.json');
    expect(pkg.dependencies['@tgwrapper/core']).toBeDefined();
    expect(pkg.dependencies['@tgwrapper/adapter-redis']).toBeDefined();
  });
});
