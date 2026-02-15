import type { ApiMethods, Message, Update, User } from '../../src/types/telegram.js';

type _SendMessageResult = ReturnType<ApiMethods['sendMessage']>;
type _GetUpdatesResult = ReturnType<ApiMethods['getUpdates']>;
type _GetMeResult = ReturnType<ApiMethods['getMe']>;
type _SetWebhookResult = ReturnType<ApiMethods['setWebhook']>;
type _SetGameScoreResult = ReturnType<ApiMethods['setGameScore']>;

const _sendMessageResult: _SendMessageResult = {
  message_id: 1,
  date: 1,
  chat: { id: 1, type: 'private' }
};

const _getUpdatesResult: _GetUpdatesResult = [
  {
    update_id: 1,
    message: {
      message_id: 1,
      date: 1,
      chat: { id: 1, type: 'private' },
      text: 'hello'
    }
  } as Update
];

const _getMeResult: _GetMeResult = {
  id: 1,
  is_bot: true,
  first_name: 'bot'
} as User;

const _setWebhookResult: _SetWebhookResult = true;

const _setGameScoreResultA: _SetGameScoreResult = true;
const _setGameScoreResultB: _SetGameScoreResult = _sendMessageResult as Message;

// @ts-expect-error sendMessage result is Message, not boolean
const _badSendMessageResult: _SendMessageResult = true;

const _badGetUpdatesResult: _GetUpdatesResult = {
  // @ts-expect-error getUpdates result is Update[]
  update_id: 1
};

// @ts-expect-error getMe result is User
const _badGetMeResult: _GetMeResult = {
  ok: true
};

void _sendMessageResult;
void _getUpdatesResult;
void _getMeResult;
void _setWebhookResult;
void _setGameScoreResultA;
void _setGameScoreResultB;
