import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const snapshotPath = resolve(process.cwd(), 'docs/telegram-api-schema.snapshot.json');
const outPath = resolve(process.cwd(), process.env.TGWRAPPER_RESULTS_OUT ?? 'src/types/telegram.results.generated.ts');

const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
const methods = Array.isArray(snapshot.methods) ? [...new Set(snapshot.methods)].sort() : [];

if (methods.length === 0) {
  console.error('Schema snapshot has no methods. Run telegram:schema:fetch first.');
  process.exit(1);
}

const strictResults = {
  answerCallbackQuery: 'boolean',
  answerGuestQuery: 'boolean',
  answerInlineQuery: 'boolean',
  answerPreCheckoutQuery: 'boolean',
  answerShippingQuery: 'boolean',
  approveSuggestedPost: 'boolean',
  declineSuggestedPost: 'boolean',
  deleteAllMessageReactions: 'boolean',
  deleteMessage: 'boolean',
  deleteMessageReaction: 'boolean',
  deleteMessages: 'boolean',
  deleteWebhook: 'boolean',
  getMe: 'import("./telegram.js").User',
  getUpdates: 'import("./telegram.js").Update[]',
  getWebhookInfo: 'UnknownResult',
  sendDocument: 'import("./telegram.js").Message',
  sendInvoice: 'import("./telegram.js").Message',
  sendLivePhoto: 'import("./telegram.js").Message',
  sendMediaGroup: 'import("./telegram.js").Message[]',
  sendMessage: 'import("./telegram.js").Message',
  sendPhoto: 'import("./telegram.js").Message',
  sendPoll: 'import("./telegram.js").Message',
  sendSticker: 'import("./telegram.js").Message',
  setGameScore: 'import("./telegram.js").Message | boolean',
  setMessageReaction: 'boolean',
  setWebhook: 'boolean',
  uploadStickerFile: 'UnknownResult'
};

const strictNames = Object.keys(strictResults).filter((name) => methods.includes(name)).sort();
const lines = methods
  .map((name) => {
    const resultType = strictNames.includes(name) ? strictResults[name] : 'UnknownResult';
    return `  ${name}: ${resultType};`;
  })
  .join('\n');

const strictLines = strictNames.map((name) => `  ${name}: ${strictResults[name]};`).join('\n');

const file = `/**
 * AUTO-GENERATED FILE. DO NOT EDIT.
 * Source: docs/telegram-api-schema.snapshot.json
 */

export type UnknownResult = Record<string, unknown>;

export type StrictTelegramApiMethodResults = {
${strictLines || '  // no strict method results selected'}
};

export type StrictTelegramApiMethodResultName = keyof StrictTelegramApiMethodResults;

export type TelegramApiMethodResults = {
${lines}
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
