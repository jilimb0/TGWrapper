import type { JsonObject } from './types.js';

export function redactSensitiveData(data: JsonObject): JsonObject {
  const out: JsonObject = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }
    if (typeof value !== 'string') {
      out[key] = value;
      continue;
    }
    if (/(token|authorization|api[_-]?key|secret)/i.test(key)) {
      out[key] = '[REDACTED]';
      continue;
    }
    if (/(phone|email|card|text|message)/i.test(key)) {
      out[key] = maskSensitiveString(value);
      continue;
    }
    out[key] = value
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
      .replace(/\+?[0-9][0-9\-\s()]{6,}/g, '[REDACTED_PHONE]')
      .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[REDACTED_CARD]');
  }
  return out;
}

function maskSensitiveString(input: string): string {
  if (input.length <= 8) {
    return '[REDACTED]';
  }
  return `${input.slice(0, 2)}***${input.slice(-2)}`;
}
