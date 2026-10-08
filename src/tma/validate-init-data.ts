import type {
  ParsedInitData,
  TelegramChat,
  TelegramUser,
  TmaValidationResult,
  ValidateInitDataOptions,
} from './types.js';

const DEFAULT_MAX_AGE_SECONDS = 86_400; // 24 hours

// FIPS 180-4 SHA-256 constants
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

function sha256Bytes(bytes: Uint8Array): Uint8Array {
  const byteLength = bytes.length;
  const bitLength = byteLength * 8;
  const extendedLength = (((byteLength + 8) >> 6) + 1) << 6;
  const padded = new Uint8Array(extendedLength);
  padded.set(bytes);
  padded[byteLength] = 0x80;
  const view = new DataView(padded.buffer);
  view.setBigUint64(extendedLength - 8, BigInt(bitLength), false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  for (let i = 0; i < extendedLength; i += 64) {
    for (let t = 0; t < 16; t += 1) {
      w[t] = view.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t += 1) {
      const wt15 = w[t - 15] ?? 0;
      const wt2 = w[t - 2] ?? 0;
      const s0 = rightRotate(wt15, 7) ^ rightRotate(wt15, 18) ^ (wt15 >>> 3);
      const s1 = rightRotate(wt2, 17) ^ rightRotate(wt2, 19) ^ (wt2 >>> 10);
      w[t] = ((w[t - 16] ?? 0) + s0 + (w[t - 7] ?? 0) + s1) | 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let t = 0; t < 64; t += 1) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + (K[t] ?? 0) + (w[t] ?? 0)) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const result = new Uint8Array(32);
  const resView = new DataView(result.buffer);
  resView.setUint32(0, h0, false);
  resView.setUint32(4, h1, false);
  resView.setUint32(8, h2, false);
  resView.setUint32(12, h3, false);
  resView.setUint32(16, h4, false);
  resView.setUint32(20, h5, false);
  resView.setUint32(24, h6, false);
  resView.setUint32(28, h7, false);
  return result;
}

function hmacSha256(key: Uint8Array | string, message: Uint8Array | string): Uint8Array {
  const encoder = new TextEncoder();
  let keyBytes = typeof key === 'string' ? encoder.encode(key) : key;
  const msgBytes = typeof message === 'string' ? encoder.encode(message) : message;
  const blockSize = 64;

  if (keyBytes.length > blockSize) {
    keyBytes = sha256Bytes(keyBytes);
  }

  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(keyBytes);

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i += 1) {
    const b = paddedKey[i] ?? 0;
    oKeyPad[i] = b ^ 0x5c;
    iKeyPad[i] = b ^ 0x36;
  }

  const innerMsg = new Uint8Array(blockSize + msgBytes.length);
  innerMsg.set(iKeyPad);
  innerMsg.set(msgBytes, blockSize);
  const innerHash = sha256Bytes(innerMsg);

  const outerMsg = new Uint8Array(blockSize + 32);
  outerMsg.set(oKeyPad);
  outerMsg.set(innerHash, blockSize);
  return sha256Bytes(outerMsg);
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i] ?? 0;
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function parseTelegramUser(rawUser: string | null): TelegramUser | undefined {
  if (!rawUser) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(rawUser);
    if (typeof parsed !== 'object' || parsed === null || typeof parsed.id !== 'number') {
      return undefined;
    }
    return {
      id: parsed.id,
      firstName: String(parsed.first_name ?? ''),
      lastName: parsed.last_name !== undefined ? String(parsed.last_name) : undefined,
      username: parsed.username !== undefined ? String(parsed.username) : undefined,
      languageCode: parsed.language_code !== undefined ? String(parsed.language_code) : undefined,
      isPremium: parsed.is_premium === true,
      allowsWriteToPm: parsed.allows_write_to_pm === true,
      photoUrl: parsed.photo_url !== undefined ? String(parsed.photo_url) : undefined,
    };
  } catch {
    return undefined;
  }
}

function parseTelegramChat(rawChat: string | null): TelegramChat | undefined {
  if (!rawChat) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(rawChat);
    if (typeof parsed !== 'object' || parsed === null || typeof parsed.id !== 'number') {
      return undefined;
    }
    return {
      id: parsed.id,
      type: String(parsed.type ?? 'channel'),
      title: String(parsed.title ?? ''),
      username: parsed.username !== undefined ? String(parsed.username) : undefined,
      photoUrl: parsed.photo_url !== undefined ? String(parsed.photo_url) : undefined,
    };
  } catch {
    return undefined;
  }
}

/**
 * Computes the HMAC-SHA256 signature for Telegram Mini App initData string.
 */
export function computeInitDataHash(initDataRaw: string, botToken: string): string {
  const params = new URLSearchParams(initDataRaw);
  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key !== 'hash') {
      pairs.push(`${key}=${value}`);
    }
  }
  pairs.sort();
  const dataCheckString = pairs.join('\n');
  const secretKey = hmacSha256('WebAppData', botToken);
  const finalHmac = hmacSha256(secretKey, dataCheckString);
  return bytesToHex(finalHmac);
}

/**
 * Parses raw Telegram Mini App initData query string into typed object.
 */
export function parseInitData(initDataRaw: string): ParsedInitData {
  const params = new URLSearchParams(initDataRaw);
  const raw: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    raw[key] = value;
  }

  const hash = raw.hash ?? '';
  const authDate = raw.auth_date ? Number.parseInt(raw.auth_date, 10) : 0;
  const user = parseTelegramUser(raw.user ?? null);
  const receiver = parseTelegramUser(raw.receiver ?? null);
  const chat = parseTelegramChat(raw.chat ?? null);
  const queryId = raw.query_id;
  const chatType = raw.chat_type;
  const chatInstance = raw.chat_instance;
  const startParam = raw.start_param;
  const canSendAfter = raw.can_send_after ? Number.parseInt(raw.can_send_after, 10) : undefined;

  return {
    queryId,
    user,
    receiver,
    chat,
    chatType,
    chatInstance,
    startParam,
    canSendAfter,
    authDate,
    hash,
    raw,
  };
}

/**
 * Validates and parses initData, returning status and parsed user details.
 */
export function parseAndValidateInitData(
  initDataRaw: string,
  botToken: string,
  options?: ValidateInitDataOptions,
): TmaValidationResult {
  if (!initDataRaw || !botToken) {
    return { valid: false, error: 'MALFORMED' };
  }

  const params = new URLSearchParams(initDataRaw);
  const hash = params.get('hash');
  if (!hash) {
    return { valid: false, error: 'MISSING_HASH' };
  }

  const authDateStr = params.get('auth_date');
  if (!authDateStr) {
    return { valid: false, error: 'MISSING_AUTH_DATE' };
  }

  const authDate = Number.parseInt(authDateStr, 10);
  if (Number.isNaN(authDate)) {
    return { valid: false, error: 'MALFORMED' };
  }

  // Check replay-attack freshness
  const maxAge = options?.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
  const currentSeconds = Math.floor((options?.currentTimeMs ?? Date.now()) / 1000);
  if (maxAge > 0) {
    const age = currentSeconds - authDate;
    if (age > maxAge || age < -60) {
      return { valid: false, error: 'EXPIRED' };
    }
  }

  const calculatedHash = computeInitDataHash(initDataRaw, botToken);
  if (!timingSafeEqualHex(calculatedHash.toLowerCase(), hash.toLowerCase())) {
    return { valid: false, error: 'HASH_MISMATCH' };
  }

  const data = parseInitData(initDataRaw);
  return { valid: true, data };
}

/**
 * Quick boolean check for initData cryptographic authenticity and freshness.
 */
export function validateInitData(
  initDataRaw: string,
  botToken: string,
  options?: ValidateInitDataOptions,
): boolean {
  return parseAndValidateInitData(initDataRaw, botToken, options).valid;
}
