import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const snapshotPath = resolve(process.cwd(), 'docs/telegram-api-schema.snapshot.json');
const telegramTypesPath = resolve(process.cwd(), 'src/types/telegram.ts');
const outPath = resolve(process.cwd(), process.env.TGWRAPPER_PAYLOADS_OUT ?? 'src/types/telegram.payloads.generated.ts');

const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
const telegramTypesSource = readFileSync(telegramTypesPath, 'utf8');
const methods = Array.isArray(snapshot.methods) ? [...new Set(snapshot.methods)].sort() : [];
const structuredMethods = Array.isArray(snapshot.structured_methods) ? snapshot.structured_methods : [];
const exportedTypeNames = new Set(
  [...telegramTypesSource.matchAll(/export\s+(?:interface|type)\s+([A-Z][A-Za-z0-9_]*)\b/g)].map((match) => match[1])
);

if (methods.length === 0) {
  console.error('Schema snapshot has no methods. Run telegram:schema:fetch first.');
  process.exit(1);
}

function splitUnionTypes(value) {
  return value
    .split(/\s+or\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function mapAtomicDocType(type) {
  const normalized = type.trim();
  if (!normalized) return 'unknown';
  if (/^Array of /i.test(normalized)) {
    const inner = normalized.replace(/^Array of /i, '').trim();
    return `${mapDocTypeToTs(inner)}[]`;
  }
  if (/^String$/i.test(normalized)) return 'string';
  if (/^(Integer|Float)$/i.test(normalized)) return 'number';
  if (/^(Boolean|True)$/i.test(normalized)) return 'boolean';
  if (/^InputFile$/i.test(normalized)) return 'string';
  if (/^InputFile or String$/i.test(normalized)) return 'string';
  if (/^Array of String$/i.test(normalized)) return 'string[]';
  if (/^Array of Integer$/i.test(normalized)) return 'number[]';
  if (exportedTypeNames.has(normalized)) return `import("./telegram.js").${normalized}`;
  return 'unknown';
}

function mapDocTypeToTs(type) {
  const normalized = type.trim();
  if (!normalized) return 'unknown';
  if (/\s+or\s+/i.test(normalized)) {
    return [...new Set(splitUnionTypes(normalized).map((part) => mapAtomicDocType(part)))].join(' | ');
  }
  return mapAtomicDocType(normalized);
}

function optimizeStructuredPayload(fields) {
  const aliases = [];
  let remainder = [...fields];

  const consumeAlias = (name, signatures) => {
    const matched = signatures.filter((signature) => remainder.includes(signature));
    if (matched.length === 0) return;
    remainder = remainder.filter((field) => !matched.includes(field));
    aliases.push(name);
  };

  consumeAlias('WithChatId', ['chat_id: number | string;', 'chat_id?: number | string;']);
  consumeAlias('WithBusinessConnectionId', ['business_connection_id?: string;']);
  consumeAlias('WithMessageThreadId', ['message_thread_id?: number;']);
  consumeAlias('WithDirectMessagesTopicId', ['direct_messages_topic_id?: number;']);
  consumeAlias('WithReplyMarkup', ['reply_markup?: import("./telegram.js").InlineKeyboardMarkup | unknown;']);
  consumeAlias('WithReplyParameters', ['reply_parameters?: unknown;']);
  consumeAlias('WithSuggestedPostParameters', ['suggested_post_parameters?: unknown;']);
  consumeAlias('WithDisableNotification', ['disable_notification?: boolean;']);
  consumeAlias('WithProtectContent', ['protect_content?: boolean;']);
  consumeAlias('WithAllowPaidBroadcast', ['allow_paid_broadcast?: boolean;']);
  consumeAlias('WithMessageEffectId', ['message_effect_id?: string;']);

  const objectPart = remainder.length > 0 ? `{ ${remainder.join(' ')} }` : '{}';
  return [...aliases, objectPart, 'UnknownPayload'].join(' & ');
}

function buildStructuredPayload(method) {
  if (!method || !Array.isArray(method.params) || method.params.length === 0) {
    return 'UnknownPayload';
  }
  const fields = method.params.map((param) => {
    const optional = param.required === true ? '' : '?';
    const tsType = mapDocTypeToTs(String(param.type ?? 'unknown'));
    return `${param.name}${optional}: ${tsType};`;
  });
  return optimizeStructuredPayload(fields);
}

const strictPayloads = {
  approveSuggestedPost: "{ chat_id: number | string; suggested_post_id: string } & UnknownPayload",
  answerCallbackQuery: "{ callback_query_id: string; text?: string } & UnknownPayload",
  answerGuestQuery: "{ guest_query_id: string | number; text?: string } & UnknownPayload",
  answerInlineQuery: "{ inline_query_id: string; results: unknown[] } & UnknownPayload",
  createInvoiceLink:
    "{ title: string; description: string; payload: string; currency: string; prices: unknown[] } & UnknownPayload",
  declineSuggestedPost: "{ chat_id: number | string; suggested_post_id: string } & UnknownPayload",
  deleteAllMessageReactions: "{ chat_id: number | string; message_id: number } & UnknownPayload",
  deleteMessage: "{ chat_id: number | string; message_id: number } & UnknownPayload",
  deleteMessageReaction: "{ chat_id: number | string; message_id: number; reaction?: unknown[] } & UnknownPayload",
  deleteWebhook: "{ drop_pending_updates?: boolean } & UnknownPayload",
  editMessageText: "{ text: string; chat_id?: number | string; message_id?: number; inline_message_id?: string } & UnknownPayload",
  getManagedBotAccessSettings: "{ bot_id: number } & UnknownPayload",
  getStickerSet: "{ name: string } & UnknownPayload",
  getUpdates: "{ offset?: number; limit?: number; timeout?: number; allowed_updates?: string[] } & UnknownPayload",
  getWebhookInfo: "UnknownPayload",
  replaceManagedBotToken: "{ bot_id: number } & UnknownPayload",
  sendDocument: "{ chat_id: number | string; document: string } & UnknownPayload",
  sendInvoice:
    "{ chat_id: number | string; title: string; description: string; payload: string; currency: string; prices: unknown[] } & UnknownPayload",
  sendLivePhoto: "{ chat_id: number | string; photo: string } & UnknownPayload",
  sendMediaGroup: "{ chat_id: number | string; media: unknown[] } & UnknownPayload",
  sendMessage: "{ chat_id: number | string; text: string } & UnknownPayload",
  sendPhoto: "{ chat_id: number | string; photo: string } & UnknownPayload",
  sendPoll: "{ chat_id: number | string; question: string; options: string[] } & UnknownPayload",
  sendSticker: "{ chat_id: number | string; sticker: string } & UnknownPayload",
  setGameScore: "{ user_id: number; score: number; chat_id?: number | string; message_id?: number; inline_message_id?: string } & UnknownPayload",
  setManagedBotAccessSettings: "{ bot_id: number; can_reply?: boolean } & UnknownPayload",
  setMessageReaction: "{ chat_id: number | string; message_id: number; reaction?: unknown[]; is_big?: boolean } & UnknownPayload",
  setWebhook: "{ url: string; max_connections?: number; allowed_updates?: string[]; drop_pending_updates?: boolean; secret_token?: string } & UnknownPayload",
  uploadStickerFile: "{ user_id: number; sticker: string; sticker_format: 'static' | 'animated' | 'video' } & UnknownPayload"
};

const structuredPayloads = new Map(
  structuredMethods
    .filter((method) => method && typeof method.name === 'string' && methods.includes(method.name))
    .map((method) => [method.name, buildStructuredPayload(method)])
);

const strictNames = Object.keys(strictPayloads).filter((name) => methods.includes(name)).sort();

const payloadRecord = methods
  .map((name) => {
    if (strictNames.includes(name)) {
      return `  ${name}: StrictTelegramApiMethodPayloads['${name}'];`;
    }
    const structured = structuredPayloads.get(name);
    if (structured && structured !== 'UnknownPayload') {
      return `  ${name}: ${structured};`;
    }
    return `  ${name}: UnknownPayload;`;
  })
  .join('\n');

const strictRecord = strictNames.map((name) => `  ${name}: ${strictPayloads[name]};`).join('\n');

const file = `/**
 * AUTO-GENERATED FILE. DO NOT EDIT.
 * Source: docs/telegram-api-schema.snapshot.json
 */

export type UnknownPayload = Record<string, unknown>;
export type WithChatId = { chat_id?: number | string; };
export type WithBusinessConnectionId = { business_connection_id?: string; };
export type WithMessageThreadId = { message_thread_id?: number; };
export type WithDirectMessagesTopicId = { direct_messages_topic_id?: number; };
export type WithReplyMarkup = { reply_markup?: import("./telegram.js").InlineKeyboardMarkup | unknown; };
export type WithReplyParameters = { reply_parameters?: unknown; };
export type WithSuggestedPostParameters = { suggested_post_parameters?: unknown; };
export type WithDisableNotification = { disable_notification?: boolean; };
export type WithProtectContent = { protect_content?: boolean; };
export type WithAllowPaidBroadcast = { allow_paid_broadcast?: boolean; };
export type WithMessageEffectId = { message_effect_id?: string; };

export type StrictTelegramApiMethodPayloads = {
${strictRecord || '  // no strict payloads selected'}
};

export type StrictTelegramApiMethodName = keyof StrictTelegramApiMethodPayloads;

export type TelegramApiMethodPayloads = {
${payloadRecord}
};
`;

writeFileSync(outPath, file, 'utf8');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      out: outPath,
      methods: methods.length,
      strict_methods: strictNames.length,
      structured_methods: structuredPayloads.size,
      exported_types: exportedTypeNames.size
    },
    null,
    2
  )
);
