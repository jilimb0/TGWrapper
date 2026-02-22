import type { Update } from '../types/telegram.js';

export function createMessageUpdate(params: {
  updateId?: number;
  userId?: number;
  chatId?: number;
  text?: string;
} = {}): Update {
  const updateId = params.updateId ?? 1;
  const userId = params.userId ?? 1;
  const chatId = params.chatId ?? userId;
  const text = params.text ?? 'hello';

  return {
    update_id: updateId,
    message: {
      message_id: updateId,
      date: Math.floor(Date.now() / 1000),
      chat: {
        id: chatId,
        type: 'private',
        first_name: 'Test'
      },
      from: {
        id: userId,
        is_bot: false,
        first_name: 'User'
      },
      text
    }
  } as Update;
}

export function createCallbackUpdate(params: {
  updateId?: number;
  userId?: number;
  chatId?: number;
  data?: string;
} = {}): Update {
  const updateId = params.updateId ?? 1;
  const userId = params.userId ?? 1;
  const chatId = params.chatId ?? userId;

  return {
    update_id: updateId,
    callback_query: {
      id: String(updateId),
      from: {
        id: userId,
        is_bot: false,
        first_name: 'User'
      },
      chat_instance: String(chatId),
      data: params.data ?? 'test',
      message: {
        message_id: updateId,
        date: Math.floor(Date.now() / 1000),
        chat: {
          id: chatId,
          type: 'private',
          first_name: 'Test'
        }
      }
    }
  } as Update;
}
