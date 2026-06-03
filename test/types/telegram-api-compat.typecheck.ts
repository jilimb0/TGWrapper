import type {
  ApiMethods,
  InlineKeyboardButton,
  KeyboardButton,
  Update,
  User
} from '../../src/types/telegram.js';

type _SendMessageDraftParams = Parameters<ApiMethods['sendMessageDraft']>[0];
type _CreateChatSubscriptionInviteLinkParams = Parameters<ApiMethods['createChatSubscriptionInviteLink']>[0];
type _SetMessageReactionParams = Parameters<ApiMethods['setMessageReaction']>[0];
type _VerifyUserParams = Parameters<ApiMethods['verifyUser']>[0];
type _AnswerGuestQueryParams = Parameters<ApiMethods['answerGuestQuery']>[0];

const _userFields: User = {
  id: 1,
  is_bot: false,
  first_name: 'topic-user',
  has_main_web_app: true,
  added_to_attachment_menu: true,
  supports_guest_queries: true
};

const _inlineButtonWithCopyText: InlineKeyboardButton = {
  text: 'Open',
  callback_data: 'cb',
  copy_text: {
    text: 'copy'
  }
};

const _keyboardButtonWithRequest: KeyboardButton = {
  text: 'request',
  request_chat: {
    request_id: 1,
    chat_is_channel: false
  }
};

const _businessLikeUpdate: Update = {
  update_id: 1,
  business_connection: {
    id: 'bc_1',
    user: {
      id: 3,
      is_bot: false,
      first_name: 'owner'
    },
    user_chat_id: 4,
    date: 1,
    can_reply: true,
    is_enabled: true
  },
  deleted_business_messages: {
    business_connection_id: 'bc_1',
    chat: {
      id: 1,
      type: 'private',
      first_name: 'chat-user'
    },
    message_ids: [5]
  },
  business_message: {
    message_id: 5,
    date: 1,
    chat: {
      id: 1,
      type: 'private',
      first_name: 'chat-user'
    },
    from: {
      id: 2,
      is_bot: false,
      first_name: 'biz'
    },
    text: 'hi'
  }
};

const _paidMediaUpdate: Update = {
  update_id: 2,
  purchased_paid_media: {
    from: {
      id: 88,
      is_bot: false,
      first_name: 'buyer'
    },
    paid_media_payload: 'invoice-ref-1'
  }
};

const _guestUpdate: Update = {
  update_id: 3,
  guest_message: {
    message_id: 11,
    date: 1,
    chat: {
      id: 10,
      type: 'private'
    },
    from: {
      id: 9,
      is_bot: false,
      first_name: 'guest-user'
    },
    guest_query_id: 'gq_1',
    guest_bot_caller_user: {
      id: 8,
      is_bot: true,
      first_name: 'caller-bot'
    }
  }
};

void _userFields;
void _inlineButtonWithCopyText;
void _keyboardButtonWithRequest;
void _businessLikeUpdate;
void _paidMediaUpdate;
void _guestUpdate;
void (null as unknown as _SendMessageDraftParams);
void (null as unknown as _CreateChatSubscriptionInviteLinkParams);
void (null as unknown as _SetMessageReactionParams);
void (null as unknown as _VerifyUserParams);
void (null as unknown as _AnswerGuestQueryParams);
