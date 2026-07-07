import { describe, expect, it } from 'vitest';
import { WebhookDebugger } from '../src/debugger/webhook-debugger.js';

const sampleUpdate = {
  update_id: 1,
  message: {
    message_id: 10,
    date: 1700000000,
    text: '/start',
    chat: { id: 123, type: 'private' as const },
  },
};

describe('WebhookDebugger', () => {
  describe('when disabled (default)', () => {
    it('does not capture entries', () => {
      const dbg = new WebhookDebugger();
      dbg.capture(sampleUpdate, { 'x-telegram-secret': 'abc' });
      expect(dbg.size).toBe(0);
      expect(dbg.getEntries()).toEqual([]);
    });

    it('renderPage shows empty state', () => {
      const dbg = new WebhookDebugger();
      const page = dbg.renderPage();
      expect(page).toContain('No webhooks captured yet');
    });
  });

  describe('when enabled', () => {
    it('captures an entry', () => {
      const dbg = new WebhookDebugger({ enabled: true });
      dbg.capture(sampleUpdate, { 'x-telegram-secret': 'abc' });
      expect(dbg.size).toBe(1);

      const entries = dbg.getEntries();
      expect(entries[0]!.update).toEqual(sampleUpdate);
      expect(entries[0]!.headers!['x-telegram-secret']).toBe('abc');
      expect(entries[0]!.timestamp).toBeDefined();
    });

    it('captures session state alongside webhook', () => {
      const dbg = new WebhookDebugger({ enabled: true });
      dbg.capture(sampleUpdate, {}, { current_state: 'awaiting_name', data: { name: 'Test' } });

      const entries = dbg.getEntries();
      expect(entries[0]!.session).toBeDefined();
      expect(entries[0]!.session!.current_state).toBe('awaiting_name');
    });

    it('evicts oldest entry when over maxEntries', () => {
      const dbg = new WebhookDebugger({ enabled: true, maxEntries: 2 });

      dbg.capture({ ...sampleUpdate, update_id: 1 });
      dbg.capture({ ...sampleUpdate, update_id: 2 });
      dbg.capture({ ...sampleUpdate, update_id: 3 });

      expect(dbg.size).toBe(2);
      const entries = dbg.getEntries();
      // Newest first
      expect(entries[0]!.update.update_id).toBe(3);
      expect(entries[1]!.update.update_id).toBe(2);
    });

    it('clear removes all entries', () => {
      const dbg = new WebhookDebugger({ enabled: true });
      dbg.capture(sampleUpdate);
      dbg.clear();
      expect(dbg.size).toBe(0);
    });

    it('renderPage includes captured entries', () => {
      const dbg = new WebhookDebugger({ enabled: true });
      dbg.capture(sampleUpdate, { 'x-test': 'value' });

      const page = dbg.renderPage();
      expect(page).toContain('1 captured');
      expect(page).toContain('message');
      expect(page).toContain('/start');
    });

    it('getEntries returns newest first', () => {
      const dbg = new WebhookDebugger({ enabled: true });
      dbg.capture({ ...sampleUpdate, update_id: 1 });
      dbg.capture({ ...sampleUpdate, update_id: 2 });

      const entries = dbg.getEntries();
      expect(entries[0]!.update.update_id).toBe(2);
      expect(entries[1]!.update.update_id).toBe(1);
    });

    it('handles updates without headers gracefully', () => {
      const dbg = new WebhookDebugger({ enabled: true });
      dbg.capture(sampleUpdate);

      const entries = dbg.getEntries();
      expect(entries[0]!.update).toBeDefined();
      expect(entries[0]!.headers).toBeUndefined();
    });
  });
});
