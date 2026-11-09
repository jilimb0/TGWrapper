import { describe, expect, it } from 'vitest';
import {
  formatNanotons,
  isTonWalletTransferMessage,
  isValidTonAddress,
  parseTonToNanotons,
  verifyTonWalletSignData,
} from '../src/payments/ton.js';
import type { Message } from '../src/types/telegram.js';

describe('TON Wallet Integration (Bot API 10.4)', () => {
  describe('formatNanotons', () => {
    it('formats positive amounts with integer precision', () => {
      expect(formatNanotons('1000000000')).toBe('1');
      expect(formatNanotons(1500000000n)).toBe('1.5');
      expect(formatNanotons('100000000')).toBe('0.1');
      expect(formatNanotons('1')).toBe('0.000000001');
      expect(formatNanotons('0')).toBe('0');
    });

    it('formats negative amounts correctly', () => {
      expect(formatNanotons('-1000000000')).toBe('-1');
      expect(formatNanotons('-2500000000')).toBe('-2.5');
      expect(formatNanotons('-1')).toBe('-0.000000001');
    });
  });

  describe('parseTonToNanotons', () => {
    it('parses decimal TON strings without floating-point inaccuracies', () => {
      expect(parseTonToNanotons('1')).toBe(1000000000n);
      expect(parseTonToNanotons('1.5')).toBe(1500000000n);
      expect(parseTonToNanotons('0.000000001')).toBe(1n);
      expect(parseTonToNanotons('-2.5')).toBe(-2500000000n);
      expect(parseTonToNanotons(10)).toBe(10000000000n);
    });

    it('throws on invalid formats', () => {
      expect(() => parseTonToNanotons('')).toThrow(/Empty TON amount/);
      expect(() => parseTonToNanotons('1.2.3')).toThrow(/Invalid TON amount format/);
      expect(() => parseTonToNanotons('abc')).toThrow(/Invalid non-numeric characters/);
    });
  });

  describe('isValidTonAddress', () => {
    it('validates raw addresses', () => {
      const raw = '0:5555555555555555555555555555555555555555555555555555555555555555';
      const masterchainRaw = '-1:abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      expect(isValidTonAddress(raw)).toBe(true);
      expect(isValidTonAddress(masterchainRaw)).toBe(true);
      expect(isValidTonAddress('1:abc')).toBe(false); // invalid workchain
    });

    it('validates 48-character user-friendly base64/base64url addresses', () => {
      const friendly1 = 'EQD-6aK8uSj_H1bM5hV8V1S6W9yZ8Y4L5K2J1H0G9F8E7D6C';
      const friendly2 = 'UQD-6aK8uSj_H1bM5hV8V1S6W9yZ8Y4L5K2J1H0G9F8E7D6C';
      expect(isValidTonAddress(friendly1)).toBe(true);
      expect(isValidTonAddress(friendly2)).toBe(true);
      expect(isValidTonAddress('short_address')).toBe(false);
      expect(isValidTonAddress(123 as unknown as string)).toBe(false);
    });
  });

  describe('verifyTonWalletSignData', () => {
    it('verifies signed data matching the bot domain', () => {
      const signData = JSON.stringify({
        domain: 'bot12345',
        payload: { action: 'auth', timestamp: 1700000000 },
      });

      const res = verifyTonWalletSignData(signData, 12345);
      expect(res.verified).toBe(true);
      expect(res.domain).toBe('bot12345');
      expect((res.payload as Record<string, unknown>).action).toBe('auth');
    });

    it('rejects signed data for a different domain', () => {
      const signData = JSON.stringify({
        domain: 'bot99999',
        payload: { action: 'auth' },
      });

      const res = verifyTonWalletSignData(signData, 12345);
      expect(res.verified).toBe(false);
    });

    it('handles malformed JSON gracefully', () => {
      expect(verifyTonWalletSignData('invalid-json', 12345).verified).toBe(false);
    });
  });

  describe('isTonWalletTransferMessage', () => {
    it('identifies service messages containing ton_wallet_transfer', () => {
      const msg = {
        message_id: 1,
        date: 123,
        chat: { id: 1, type: 'private' },
        ton_wallet_transfer: {
          transaction_id: 'tx_123',
          peer_address: '0:123',
          amount: '1000000000',
        },
      } as unknown as Message;

      expect(isTonWalletTransferMessage(msg)).toBe(true);
      expect(isTonWalletTransferMessage({ message_id: 2, date: 123, chat: { id: 1, type: 'private' } } as Message)).toBe(false);
    });
  });
});
