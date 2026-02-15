import type { TelegramApiMethodName, TelegramUpdateKey } from './telegram.schema.generated.js';
import type { TelegramApiMethodPayloads } from './telegram.payloads.generated.js';

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
};

export type Update = {
  update_id: number;
} & GeneratedUpdateFields &
  TypedUpdateFields & {
    [key: string]: unknown;
  };

export type ApiMethods<T = unknown> = Record<string, (payload: UnknownObject) => T> & {
  [K in TelegramApiMethodName]: (payload: TelegramApiMethodPayloads[K]) => T;
};
