import type { JsonObject, JsonValue } from './types.js';

export function redactSensitiveData(data: JsonObject, depth = 0): JsonObject {
  if (depth > 8) return data;
  const out: JsonObject = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }
    if (/(token|authorization|api[_-]?key|secret|password|initdata)/i.test(key)) {
      out[key] = '[REDACTED]';
      continue;
    }
    if (value !== null && typeof value === 'object') {
      if (Array.isArray(value)) {
        out[key] = value.map((item) =>
          item !== null && typeof item === 'object' && !Array.isArray(item)
            ? redactSensitiveData(item as JsonObject, depth + 1)
            : item
        ) as JsonValue;
      } else {
        out[key] = redactSensitiveData(value as JsonObject, depth + 1);
      }
      continue;
    }
    if (typeof value !== 'string') {
      out[key] = value;
      continue;
    }
    if (/(phone|email|card|text|message)/i.test(key)) {
      out[key] = maskSensitiveString(value);
      continue;
    }
    out[key] = value
      .replace(/bot\d{6,12}:[A-Za-z0-9_-]{30,45}/g, 'bot[REDACTED]')
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
