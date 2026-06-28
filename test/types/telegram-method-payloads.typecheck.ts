import type { ApiMethods } from '../../src/types/telegram.js';

type _SendMessagePayload = Parameters<ApiMethods['sendMessage']>[0];
type _GetUpdatesPayload = Parameters<ApiMethods['getUpdates']>[0];
type _SetWebhookPayload = Parameters<ApiMethods['setWebhook']>[0];
type _SendInvoicePayload = Parameters<ApiMethods['sendInvoice']>[0];
type _UploadStickerFilePayload = Parameters<ApiMethods['uploadStickerFile']>[0];

const _okSendMessage: _SendMessagePayload = {
  chat_id: 1,
  text: 'hello',
  parse_mode: 'HTML',
};

const _okGetUpdates: _GetUpdatesPayload = {
  offset: 10,
  timeout: 20,
  allowed_updates: ['message', 'callback_query'],
};

const _okSetWebhook: _SetWebhookPayload = {
  url: 'https://example.com/hook',
  drop_pending_updates: true,
};

const _okSendInvoice: _SendInvoicePayload = {
  chat_id: 1,
  title: 'Premium',
  description: 'desc',
  payload: 'invoice_payload',
  currency: 'USD',
  prices: [],
};

const _okUploadStickerFile: _UploadStickerFilePayload = {
  user_id: 1,
  sticker: 'file_id',
  sticker_format: 'static',
};

// @ts-expect-error missing required text
const _badSendMessage: _SendMessagePayload = {
  chat_id: 1,
};

const _badGetUpdates: _GetUpdatesPayload = {
  // @ts-expect-error wrong type for allowed_updates
  allowed_updates: 'message',
};

const _badSetWebhook: _SetWebhookPayload = {
  // @ts-expect-error url must be string
  url: 42,
};

// @ts-expect-error missing required prices
const _badSendInvoice: _SendInvoicePayload = {
  chat_id: 1,
  title: 'Premium',
  description: 'desc',
  payload: 'invoice_payload',
  currency: 'USD',
};

const _badUploadStickerFile: _UploadStickerFilePayload = {
  user_id: 1,
  sticker: 'file_id',
  // @ts-expect-error invalid sticker_format literal
  sticker_format: 'gif',
};

void _okSendMessage;
void _okGetUpdates;
void _okSetWebhook;
void _okSendInvoice;
void _okUploadStickerFile;
