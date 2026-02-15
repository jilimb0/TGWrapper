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
  const rawEventDate =
    update.message?.date ??
    update.edited_message?.date ??
    update.channel_post?.date ??
    update.edited_channel_post?.date ??
    update.business_message?.date ??
    update.edited_business_message?.date ??
    update.callback_query?.message?.date ??
    update.chat_member?.date ??
    update.my_chat_member?.date ??
    update.chat_join_request?.date ??
    update.message_reaction?.date ??
    update.chat_boost?.boost?.add_date;

  const eventDate = typeof rawEventDate === 'number' ? rawEventDate : undefined;
  if (!eventDate) {
    return true;
  }

  const ageMs = nowMs - eventDate * 1000;
  return ageMs <= FIVE_MINUTES_MS;
}
