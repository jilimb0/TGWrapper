import type { Update } from '../types/telegram.js';

export function createMessageUpdate(
  params: { updateId?: number; userId?: number; chatId?: number; text?: string } = {},
): Update {
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
        first_name: 'Test',
      },
      from: {
        id: userId,
        is_bot: false,
        first_name: 'User',
      },
      text,
    },
  } as Update;
}

export function createCallbackUpdate(
  params: { updateId?: number; userId?: number; chatId?: number; data?: string } = {},
): Update {
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
        first_name: 'User',
      },
      chat_instance: String(chatId),
      data: params.data ?? 'test',
      message: {
        message_id: updateId,
        date: Math.floor(Date.now() / 1000),
        chat: {
          id: chatId,
          type: 'private',
          first_name: 'Test',
        },
      },
    },
  } as Update;
}

export function createGuestMessageUpdate(
  params: {
    updateId?: number;
    userId?: number;
    chatId?: number;
    text?: string;
    guestQueryId?: string;
  } = {},
): Update {
  const updateId = params.updateId ?? 10;
  const userId = params.userId ?? 100;
  const chatId = params.chatId ?? 200;

  return {
    update_id: updateId,
    guest_message: {
      message_id: updateId,
      date: Math.floor(Date.now() / 1000),
      chat: {
        id: chatId,
        type: 'group',
        title: 'Guest Group',
      },
      from: {
        id: userId,
        is_bot: false,
        first_name: 'GuestUser',
      },
      guest_bot_caller_user: {
        id: userId,
        is_bot: false,
        first_name: 'GuestUser',
      },
      guest_query_id: params.guestQueryId ?? 'query-123',
      text: params.text ?? 'hello guest bot',
    },
  } as unknown as Update;
}

export function createStoppedDraftUpdate(
  params: { updateId?: number; chatId?: number; draftId?: number } = {},
): Update {
  const updateId = params.updateId ?? 20;
  const chatId = params.chatId ?? 100;
  const draftId = params.draftId ?? 12345;

  return {
    update_id: updateId,
    stopped_message_generation: {
      draft_id: draftId,
      chat: {
        id: chatId,
        type: 'private',
        first_name: 'DraftUser',
      },
    },
  } as Update;
}

export function createSubscriptionUpdate(
  params: {
    updateId?: number;
    userId?: number;
    invoicePayload?: string;
    state?: string;
  } = {},
): Update {
  const updateId = params.updateId ?? 30;
  const userId = params.userId ?? 300;

  return {
    update_id: updateId,
    subscription: {
      user: {
        id: userId,
        is_bot: false,
        first_name: 'Subscriber',
      },
      invoice_payload: params.invoicePayload ?? 'sub-payload-1',
      state: params.state ?? 'active',
    },
  } as Update;
}

export function createManagedBotUpdate(
  params: { updateId?: number; userId?: number; botId?: number } = {},
): Update {
  const updateId = params.updateId ?? 40;
  const userId = params.userId ?? 400;
  const botId = params.botId ?? 500;

  return {
    update_id: updateId,
    managed_bot: {
      user: {
        id: userId,
        is_bot: false,
        first_name: 'Owner',
      },
      bot: {
        id: botId,
        is_bot: true,
        first_name: 'ManagedChildBot',
        username: 'child_bot',
      },
    },
  } as Update;
}
