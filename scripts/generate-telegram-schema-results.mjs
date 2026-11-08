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
  answerGuestQuery: 'import("./telegram.js").SentGuestMessage',
  answerInlineQuery: 'boolean',
  answerPreCheckoutQuery: 'boolean',
  answerShippingQuery: 'boolean',
  approveSuggestedPost: 'boolean',
  convertGiftToStars: 'boolean',
  declineSuggestedPost: 'boolean',
  deleteAllMessageReactions: 'boolean',
  deleteEphemeralMessage: 'boolean',
  deleteMessage: 'boolean',
  deleteMessageReaction: 'boolean',
  deleteMessages: 'boolean',
  deleteWebhook: 'boolean',
  editEphemeralMessageCaption: 'boolean',
  editEphemeralMessageMedia: 'boolean',
  editEphemeralMessageReplyMarkup: 'boolean',
  editEphemeralMessageText: 'boolean',
  editMessageChecklist: 'import("./telegram.js").Message',
  getManagedBotToken: 'string',
  getMe: 'import("./telegram.js").User',
  getMyStarBalance: 'import("./telegram.js").StarAmount',
  getUpdates: 'import("./telegram.js").Update[]',
  getWebhookInfo: 'UnknownResult',
  replaceManagedBotToken: 'string',
  sendChecklist: 'import("./telegram.js").Message',
  sendDocument: 'import("./telegram.js").Message',
  sendGift: 'boolean',
  sendInvoice: 'import("./telegram.js").Message',
  sendLivePhoto: 'import("./telegram.js").Message',
  sendMediaGroup: 'import("./telegram.js").Message[]',
  sendMessage: 'import("./telegram.js").Message',
  sendMessageDraft: 'boolean',
  sendPhoto: 'import("./telegram.js").Message',
  sendPoll: 'import("./telegram.js").Message',
  sendRichMessage: 'import("./telegram.js").Message',
  sendRichMessageDraft: 'boolean',
  sendSticker: 'import("./telegram.js").Message',
  setGameScore: 'import("./telegram.js").Message | boolean',
  setManagedBotAccessSettings: 'boolean',
  setMessageReaction: 'boolean',
  setWebhook: 'boolean',
  transferGift: 'boolean',
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
