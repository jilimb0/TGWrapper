import type { Message, TonWalletCard, TonWalletTransfer } from '../types/telegram.js';

const NANOTONS_PER_TON = 1_000_000_000n; // 10^9

/**
 * Formats a nanoton amount (as string or bigint) to a human-readable TON decimal string.
 * Strictly avoids floating point numbers to maintain integer precision (Axis 4).
 */
export function formatNanotons(nanotons: string | bigint): string {
  const value = typeof nanotons === 'string' ? BigInt(nanotons) : nanotons;
  const isNegative = value < 0n;
  const abs = isNegative ? -value : value;

  const whole = abs / NANOTONS_PER_TON;
  const fraction = abs % NANOTONS_PER_TON;

  if (fraction === 0n) {
    return `${isNegative ? '-' : ''}${whole.toString()}`;
  }

  const fractionPadded = fraction.toString().padStart(9, '0').replace(/0+$/, '');
  return `${isNegative ? '-' : ''}${whole.toString()}.${fractionPadded}`;
}

/**
 * Parses a TON decimal string or integer into nanotons bigint without floating-point math.
 */
export function parseTonToNanotons(ton: string | number): bigint {
  const str = String(ton).trim();
  if (!str) {
    throw new Error('Empty TON amount string');
  }

  const isNegative = str.startsWith('-');
  const unsigned = isNegative ? str.slice(1) : str;

  const parts = unsigned.split('.');
  if (parts.length > 2) {
    throw new Error(`Invalid TON amount format: "${str}"`);
  }

  const wholeStr = parts[0] || '0';
  const fracStr = (parts[1] || '').slice(0, 9).padEnd(9, '0');

  if (!/^\d+$/.test(wholeStr) || !/^\d+$/.test(fracStr)) {
    throw new Error(`Invalid non-numeric characters in TON amount: "${str}"`);
  }

  const whole = BigInt(wholeStr);
  const frac = BigInt(fracStr);
  const total = whole * NANOTONS_PER_TON + frac;

  return isNegative ? -total : total;
}

/**
 * Validates whether a given string is a valid TON address.
 * Supports:
 * - Raw address format: `<workchain>:<64 hex chars>` (e.g. `0:...` or `-1:...`)
 * - User-friendly base64/base64url format (48 chars, e.g. `EQ...`, `UQ...`)
 */
export function isValidTonAddress(address: string): boolean {
  if (typeof address !== 'string') return false;
  const trimmed = address.trim();

  // Raw format: workchain:hex64
  if (/^(-1|0):[0-9a-fA-F]{64}$/.test(trimmed)) {
    return true;
  }

  // User-friendly base64 / base64url format (48 characters)
  if (/^[A-Za-z0-9_-]{48}$/.test(trimmed) || /^[A-Za-z0-9+/]{48}$/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Validates domain and parses sign_data payload from WidgetQueryTypeSignData.
 * Telegram Bot API 10.4 signs data for domain `bot<bot_id>`.
 */
export function verifyTonWalletSignData(
  signData: string,
  expectedBotId: string | number,
): { verified: boolean; payload?: unknown; domain?: string } {
  try {
    const parsed = JSON.parse(signData);
    const expectedDomain = `bot${expectedBotId}`;

    if (parsed && typeof parsed === 'object' && 'domain' in parsed) {
      const domain = String(parsed.domain);
      const verified = domain === expectedDomain;
      return { verified, payload: parsed.payload ?? parsed, domain };
    }

    return { verified: false, payload: parsed };
  } catch {
    return { verified: false };
  }
}

/**
 * Type guard for messages representing a service message about a TON wallet transfer.
 */
export function isTonWalletTransferMessage(
  message: Message | undefined,
): message is Message & { ton_wallet_transfer: TonWalletTransfer } {
  return Boolean(message && 'ton_wallet_transfer' in message && message.ton_wallet_transfer !== undefined);
}
