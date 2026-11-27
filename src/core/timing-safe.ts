import crypto from 'node:crypto';

const textEncoder = new TextEncoder();

/**
 * Compares two secret strings in constant time using `crypto.timingSafeEqual`
 * after verifying matching UTF-8 byte lengths.
 */
export function timingSafeSecretEqual(a: string, b: string): boolean {
  const bufA = textEncoder.encode(a);
  const bufB = textEncoder.encode(b);
  if (bufA.byteLength !== bufB.byteLength) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
