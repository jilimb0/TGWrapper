import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const snapshotPath = resolve(process.cwd(), 'docs/telegram-api-schema.snapshot.json');
const outPath = resolve(process.cwd(), process.env.TGWRAPPER_PAYLOADS_OUT ?? 'src/types/telegram.payloads.generated.ts');

const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
const methods = Array.isArray(snapshot.methods) ? [...new Set(snapshot.methods)].sort() : [];

if (methods.length === 0) {
  console.error('Schema snapshot has no methods. Run telegram:schema:fetch first.');
  process.exit(1);
}

const strictPayloads = {
  answerCallbackQuery: "{ callback_query_id: string; text?: string } & UnknownPayload",
  answerInlineQuery: "{ inline_query_id: string; results: unknown[] } & UnknownPayload",
  createInvoiceLink:
    "{ title: string; description: string; payload: string; currency: string; prices: unknown[] } & UnknownPayload",
  deleteMessage: "{ chat_id: number | string; message_id: number } & UnknownPayload",
  deleteWebhook: "{ drop_pending_updates?: boolean } & UnknownPayload",
  editMessageText: "{ text: string; chat_id?: number | string; message_id?: number; inline_message_id?: string } & UnknownPayload",
  getStickerSet: "{ name: string } & UnknownPayload",
  getUpdates: "{ offset?: number; limit?: number; timeout?: number; allowed_updates?: string[] } & UnknownPayload",
  getWebhookInfo: "UnknownPayload",
  sendDocument: "{ chat_id: number | string; document: string } & UnknownPayload",
  sendInvoice:
    "{ chat_id: number | string; title: string; description: string; payload: string; currency: string; prices: unknown[] } & UnknownPayload",
  sendMediaGroup: "{ chat_id: number | string; media: unknown[] } & UnknownPayload",
  sendMessage: "{ chat_id: number | string; text: string } & UnknownPayload",
  sendPhoto: "{ chat_id: number | string; photo: string } & UnknownPayload",
  sendPoll: "{ chat_id: number | string; question: string; options: string[] } & UnknownPayload",
  sendSticker: "{ chat_id: number | string; sticker: string } & UnknownPayload",
  setGameScore: "{ user_id: number; score: number; chat_id?: number | string; message_id?: number; inline_message_id?: string } & UnknownPayload",
  setMessageReaction: "{ chat_id: number | string; message_id: number; reaction?: unknown[]; is_big?: boolean } & UnknownPayload",
  setWebhook: "{ url: string; max_connections?: number; allowed_updates?: string[]; drop_pending_updates?: boolean; secret_token?: string } & UnknownPayload",
  uploadStickerFile: "{ user_id: number; sticker: string; sticker_format: 'static' | 'animated' | 'video' } & UnknownPayload"
};

const strictNames = Object.keys(strictPayloads).filter((name) => methods.includes(name)).sort();

const payloadRecord = methods
  .map((name) =>
    strictNames.includes(name) ? `  ${name}: StrictTelegramApiMethodPayloads['${name}'];` : `  ${name}: UnknownPayload;`
  )
  .join('\n');

const strictRecord = strictNames.map((name) => `  ${name}: ${strictPayloads[name]};`).join('\n');

const file = `/**
 * AUTO-GENERATED FILE. DO NOT EDIT.
 * Source: docs/telegram-api-schema.snapshot.json
 */

export type UnknownPayload = Record<string, unknown>;

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
      strict_methods: strictNames.length
    },
    null,
    2
  )
);
