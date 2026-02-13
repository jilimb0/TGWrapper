import type { Update } from '../types/telegram.js';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function isValidTelegramUpdate(value: unknown): value is Update {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.update_id === 'number';
}

export function isFreshUpdate(update: Update, nowMs = Date.now()): boolean {
  const messageDate = update.message?.date ?? update.callback_query?.message?.date;
  if (!messageDate) {
    return true;
  }

  const ageMs = nowMs - messageDate * 1000;
  return ageMs <= FIVE_MINUTES_MS;
}
