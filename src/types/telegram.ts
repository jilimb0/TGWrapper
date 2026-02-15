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

export interface Update {
  update_id: number;
  message?: Message;
  edited_message?: Message;
  channel_post?: Message;
  edited_channel_post?: Message;
  business_message?: Message;
  edited_business_message?: Message;
  callback_query?: CallbackQuery;
  inline_query?: InlineQuery;
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
    [key: string]: unknown;
  };
  my_chat_member?: {
    chat: Chat;
    from: User;
    [key: string]: unknown;
  };
  message_reaction?: {
    chat: Chat;
    user?: User;
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
  [key: string]: unknown;
}

export type ApiMethods<T = unknown> = Record<string, (payload: Record<string, unknown>) => T> & {
  sendMessage: (payload: { chat_id: number; text: string; [key: string]: unknown }) => T;
  editMessageText: (payload: { chat_id: number; message_id: number; text: string; [key: string]: unknown }) => T;
  answerCallbackQuery: (payload: { callback_query_id: string; text?: string; [key: string]: unknown }) => T;
  getUpdates: (payload: { offset?: number; limit?: number; timeout?: number; [key: string]: unknown }) => T;
  sendMessageDraft: (payload: { chat_id: number; text: string; [key: string]: unknown }) => T;
  createChatSubscriptionInviteLink: (payload: { chat_id: number; [key: string]: unknown }) => T;
  setMessageReaction: (payload: { chat_id: number; message_id: number; [key: string]: unknown }) => T;
};
