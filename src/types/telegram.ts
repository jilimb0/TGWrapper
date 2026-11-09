import type { TelegramApiMethodPayloads } from './telegram.payloads.generated.js';
import type { TelegramApiMethodResults } from './telegram.results.generated.js';
import type { TelegramApiMethodName, TelegramUpdateKey } from './telegram.schema.generated.js';

type UnknownObject = Record<string, unknown>;

export interface User {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  has_main_web_app?: boolean;
  added_to_attachment_menu?: boolean;
  supports_guest_queries?: boolean;
  [key: string]: unknown;
}

export interface Chat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel' | string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  [key: string]: unknown;
}

export namespace Message {
  export interface BaseMessage {
    message_id: number;
    date: number;
    chat: Chat;
    from?: User;
    edit_date?: number;
    entities?: Array<{
      type: string;
      offset: number;
      length: number;
      [key: string]: unknown;
    }>;
    guest_bot_caller_user?: User;
    guest_bot_caller_chat?: Chat;
    guest_query_id?: string | number;
    widget?: Widget;
    ton_wallet_transfer?: TonWalletTransfer;
    [key: string]: unknown;
  }

  export interface TextMessage extends BaseMessage {
    text: string;
  }
}

export type Message = Message.BaseMessage;

export interface CallbackQuery {
  id: string;
  from: User;
  message?: Message;
  inline_message_id?: string;
  data?: string;
  [key: string]: unknown;
}

export interface InlineQuery {
  id: string;
  from: User;
  query: string;
  offset: string;
  [key: string]: unknown;
}

export interface KeyboardButton {
  text: string;
  request_chat?: {
    request_id: number;
    chat_is_channel: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  copy_text?: {
    text: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface EphemeralMessageParameters {
  receiver_user_id?: number;
  callback_query_id?: string;
  replace_callback_query_message?: boolean;
  [key: string]: unknown;
}

export interface Widget {
  id?: string;
  width?: number;
  height?: number;
  html: string;
  public_data?: string;
  chat_data?: string;
  [key: string]: unknown;
}

export interface AreaPosition {
  x_percentage: number;
  y_percentage: number;
  width_percentage: number;
  height_percentage: number;
  rotation_angle?: number;
  scale_percentage?: number;
  [key: string]: unknown;
}

export interface TonWalletCardSticker {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  is_animated?: boolean;
  is_video?: boolean;
  position?: AreaPosition;
  [key: string]: unknown;
}

export interface TonWalletCard {
  address: string;
  amount: string;
  stickers: TonWalletCardSticker[];
  background_nft_address?: string;
  [key: string]: unknown;
}

export interface WidgetQueryWallet {
  address: string;
  amount: string;
  public_key?: string;
  state_init?: string;
  [key: string]: unknown;
}

export interface WidgetQueryTypeData {
  type: 'data';
  wallet_card?: TonWalletCard;
  [key: string]: unknown;
}

export interface WidgetQueryTypeSentTransaction {
  type: 'sent_transaction';
  wallet: WidgetQueryWallet;
  msg_hash: string;
  [key: string]: unknown;
}

export interface WidgetQueryTypeSignData {
  type: 'sign_data';
  wallet: WidgetQueryWallet;
  sign_data: string;
  [key: string]: unknown;
}

export type WidgetQueryType =
  | WidgetQueryTypeData
  | WidgetQueryTypeSentTransaction
  | WidgetQueryTypeSignData
  | { type: string; [key: string]: unknown };

export interface WidgetQuery {
  id: string;
  from: User;
  chat?: Chat;
  message_id?: number;
  inline_message_id?: string;
  chat_instance: string;
  chat_type?: 'sender' | 'private' | 'group' | 'supergroup' | 'channel' | string;
  type: WidgetQueryType;
  data: string;
  widget_id?: string;
  [key: string]: unknown;
}

export interface SharedWidgetQuery {
  id: string;
  from: User;
  type: WidgetQueryType;
  data: string;
  widget_id: string;
  [key: string]: unknown;
}

export interface TonWalletTransfer {
  transaction_id: string;
  peer_address: string;
  amount: string;
  comment?: string;
  [key: string]: unknown;
}

export interface UniqueGift {
  name: string;
  owner?: User;
  owner_address?: string;
  [key: string]: unknown;
}

export interface MessageGenerationStopped {
  chat: Chat;
  draft_id: number;
  message_thread_id?: number;
  [key: string]: unknown;
}

export interface BotSubscriptionUpdated {
  user: User;
  invoice_payload: string;
  state: 'active' | 'canceled' | 'failed' | string;
  [key: string]: unknown;
}

export interface ManagedBotUpdated {
  user: User;
  bot: User;
  [key: string]: unknown;
}

export interface SentGuestMessage {
  inline_message_id: string;
  [key: string]: unknown;
}

export interface StarAmount {
  amount: number;
  nanostar_amount?: number;
  [key: string]: unknown;
}

export type RichBlock =
  | { type: 'text'; text: string; entities?: Array<{ type: string; offset: number; length: number; [key: string]: unknown }> }
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'code'; code: string; language?: string }
  | { type: 'expandable_quote'; text: string }
  | { type: 'document'; file_id: string; caption?: string }
  | { type: 'button'; text: string; url?: string; callback_data?: string }
  | { type: string; [key: string]: unknown };

export interface InputRichMessage {
  blocks: RichBlock[];
  [key: string]: unknown;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
  [key: string]: unknown;
}

type GeneratedUpdateFields = {
  [K in TelegramUpdateKey]?: UnknownObject;
};

type TypedUpdateFields = {
  message?: Message;
  edited_message?: Message;
  channel_post?: Message;
  edited_channel_post?: Message;
  business_message?: Message;
  edited_business_message?: Message;
  deleted_business_messages?: {
    business_connection_id: string;
    chat: Chat;
    message_ids: number[];
    [key: string]: unknown;
  };
  business_connection?: {
    id: string;
    user: User;
    user_chat_id: number;
    date: number;
    can_reply: boolean;
    is_enabled: boolean;
    [key: string]: unknown;
  };
  callback_query?: CallbackQuery;
  inline_query?: InlineQuery;
  poll?: {
    id: string;
    question: string;
    total_voter_count: number;
    is_closed: boolean;
    is_anonymous: boolean;
    type: string;
    allows_multiple_answers: boolean;
    options: Array<{
      text: string;
      voter_count: number;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  poll_answer?: {
    poll_id: string;
    user?: User;
    voter_chat?: Chat;
    option_ids: number[];
    [key: string]: unknown;
  };
  chosen_inline_result?: {
    from: User;
    [key: string]: unknown;
  };
  shipping_query?: {
    from: User;
    [key: string]: unknown;
  };
  pre_checkout_query?: {
    id: string;
    from: User;
    [key: string]: unknown;
  };
  chat_join_request?: {
    chat: Chat;
    from: User;
    [key: string]: unknown;
  };
  chat_member?: {
    chat: Chat;
    from: User;
    date?: number;
    [key: string]: unknown;
  };
  my_chat_member?: {
    chat: Chat;
    from: User;
    date?: number;
    [key: string]: unknown;
  };
  message_reaction_count?: {
    chat: Chat;
    [key: string]: unknown;
  };
  removed_chat_boost?: {
    chat: Chat;
    [key: string]: unknown;
  };
  chat_boost?: {
    chat: Chat;
    boost: {
      boost_id: string;
      add_date: number;
      expiration_date: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  message_reaction?: {
    chat: Chat;
    user?: User;
    [key: string]: unknown;
  };
  purchased_paid_media?: {
    from?: User;
    paid_media_payload?: string;
    [key: string]: unknown;
  };
  guest_message?: Message;
  stopped_message_generation?: MessageGenerationStopped;
  subscription?: BotSubscriptionUpdated;
  managed_bot?: ManagedBotUpdated;
  widget_query?: WidgetQuery;
  shared_widget_query?: SharedWidgetQuery;
};

export type Update = {
  update_id: number;
} & GeneratedUpdateFields &
  TypedUpdateFields & {
    [key: string]: unknown;
  };

export type ApiMethods = Record<string, (payload: UnknownObject) => unknown> & {
  [K in TelegramApiMethodName]: (
    payload: TelegramApiMethodPayloads[K],
  ) => TelegramApiMethodResults[K];
};

export type SendMessageOptions = Omit<TelegramApiMethodPayloads['sendMessage'], 'chat_id' | 'text'>;
export type SendDocumentOptions = Omit<
  TelegramApiMethodPayloads['sendDocument'],
  'chat_id' | 'document'
>;
export type EditMessageTextOptions = TelegramApiMethodPayloads['editMessageText'];
export type EditMessageReplyMarkupOptions = TelegramApiMethodPayloads['editMessageReplyMarkup'];
