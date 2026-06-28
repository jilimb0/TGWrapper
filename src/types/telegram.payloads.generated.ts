/**
 * AUTO-GENERATED FILE. DO NOT EDIT.
 * Source: docs/telegram-api-schema.snapshot.json
 */

export type UnknownPayload = Record<string, unknown>;
export type WithChatId = { chat_id?: number | string };
export type WithBusinessConnectionId = { business_connection_id?: string };
export type WithMessageThreadId = { message_thread_id?: number };
export type WithDirectMessagesTopicId = { direct_messages_topic_id?: number };
export type WithReplyMarkup = {
  reply_markup?: import('./telegram.js').InlineKeyboardMarkup | unknown;
};
export type WithReplyParameters = { reply_parameters?: unknown };
export type WithSuggestedPostParameters = { suggested_post_parameters?: unknown };
export type WithDisableNotification = { disable_notification?: boolean };
export type WithProtectContent = { protect_content?: boolean };
export type WithAllowPaidBroadcast = { allow_paid_broadcast?: boolean };
export type WithMessageEffectId = { message_effect_id?: string };

export type StrictTelegramApiMethodPayloads = {
  answerCallbackQuery: { callback_query_id: string; text?: string } & UnknownPayload;
  answerGuestQuery: { guest_query_id: string | number; text?: string } & UnknownPayload;
  answerInlineQuery: { inline_query_id: string; results: unknown[] } & UnknownPayload;
  approveSuggestedPost: { chat_id: number | string; suggested_post_id: string } & UnknownPayload;
  createInvoiceLink: {
    title: string;
    description: string;
    payload: string;
    currency: string;
    prices: unknown[];
  } & UnknownPayload;
  declineSuggestedPost: { chat_id: number | string; suggested_post_id: string } & UnknownPayload;
  deleteAllMessageReactions: { chat_id: number | string; message_id: number } & UnknownPayload;
  deleteMessage: { chat_id: number | string; message_id: number } & UnknownPayload;
  deleteMessageReaction: {
    chat_id: number | string;
    message_id: number;
    reaction?: unknown[];
  } & UnknownPayload;
  deleteWebhook: { drop_pending_updates?: boolean } & UnknownPayload;
  editMessageText: {
    text: string;
    chat_id?: number | string;
    message_id?: number;
    inline_message_id?: string;
  } & UnknownPayload;
  getManagedBotAccessSettings: { bot_id: number } & UnknownPayload;
  getStickerSet: { name: string } & UnknownPayload;
  getUpdates: {
    offset?: number;
    limit?: number;
    timeout?: number;
    allowed_updates?: string[];
  } & UnknownPayload;
  getWebhookInfo: UnknownPayload;
  replaceManagedBotToken: { bot_id: number } & UnknownPayload;
  sendDocument: { chat_id: number | string; document: string } & UnknownPayload;
  sendInvoice: {
    chat_id: number | string;
    title: string;
    description: string;
    payload: string;
    currency: string;
    prices: unknown[];
  } & UnknownPayload;
  sendLivePhoto: { chat_id: number | string; photo: string } & UnknownPayload;
  sendMediaGroup: { chat_id: number | string; media: unknown[] } & UnknownPayload;
  sendMessage: { chat_id: number | string; text: string } & UnknownPayload;
  sendPhoto: { chat_id: number | string; photo: string } & UnknownPayload;
  sendPoll: { chat_id: number | string; question: string; options: string[] } & UnknownPayload;
  sendSticker: { chat_id: number | string; sticker: string } & UnknownPayload;
  setGameScore: {
    user_id: number;
    score: number;
    chat_id?: number | string;
    message_id?: number;
    inline_message_id?: string;
  } & UnknownPayload;
  setManagedBotAccessSettings: { bot_id: number; can_reply?: boolean } & UnknownPayload;
  setMessageReaction: {
    chat_id: number | string;
    message_id: number;
    reaction?: unknown[];
    is_big?: boolean;
  } & UnknownPayload;
  setWebhook: {
    url: string;
    max_connections?: number;
    allowed_updates?: string[];
    drop_pending_updates?: boolean;
    secret_token?: string;
  } & UnknownPayload;
  uploadStickerFile: {
    user_id: number;
    sticker: string;
    sticker_format: 'static' | 'animated' | 'video';
  } & UnknownPayload;
};

export type StrictTelegramApiMethodName = keyof StrictTelegramApiMethodPayloads;

export type TelegramApiMethodPayloads = {
  answerCallbackQuery: StrictTelegramApiMethodPayloads['answerCallbackQuery'];
  answerChatJoinRequestQuery: {
    chat_join_request_query_id: string;
    result: string;
  } & UnknownPayload;
  answerGuestQuery: StrictTelegramApiMethodPayloads['answerGuestQuery'];
  answerInlineQuery: StrictTelegramApiMethodPayloads['answerInlineQuery'];
  answerPreCheckoutQuery: {
    pre_checkout_query_id: string;
    ok: boolean;
    error_message?: string;
  } & UnknownPayload;
  answerShippingQuery: {
    shipping_query_id: string;
    ok: boolean;
    shipping_options?: unknown[];
    error_message?: string;
  } & UnknownPayload;
  answerWebAppQuery: { web_app_query_id: string; result: unknown } & UnknownPayload;
  approveChatJoinRequest: WithChatId & { user_id: number } & UnknownPayload;
  approveSuggestedPost: StrictTelegramApiMethodPayloads['approveSuggestedPost'];
  banChatMember: WithChatId & {
    user_id: number;
    until_date?: number;
    revoke_messages?: boolean;
  } & UnknownPayload;
  banChatSenderChat: WithChatId & { sender_chat_id: number } & UnknownPayload;
  close: UnknownPayload;
  closeForumTopic: WithChatId & { message_thread_id: number } & UnknownPayload;
  closeGeneralForumTopic: WithChatId & {} & UnknownPayload;
  convertGiftToStars: { business_connection_id: string; owned_gift_id: string } & UnknownPayload;
  copyMessage: WithChatId &
    WithMessageThreadId &
    WithDirectMessagesTopicId &
    WithReplyMarkup &
    WithReplyParameters &
    WithSuggestedPostParameters &
    WithDisableNotification &
    WithProtectContent &
    WithAllowPaidBroadcast &
    WithMessageEffectId & {
      from_chat_id: number | string;
      message_id: number;
      video_start_timestamp?: number;
      caption?: string;
      parse_mode?: string;
      caption_entities?: unknown[];
      show_caption_above_media?: boolean;
    } & UnknownPayload;
  copyMessages: WithChatId &
    WithMessageThreadId &
    WithDirectMessagesTopicId &
    WithDisableNotification &
    WithProtectContent & {
      from_chat_id: number | string;
      message_ids: number[];
      remove_caption?: boolean;
    } & UnknownPayload;
  createChatInviteLink: WithChatId & {
    name?: string;
    expire_date?: number;
    member_limit?: number;
    creates_join_request?: boolean;
  } & UnknownPayload;
  createChatSubscriptionInviteLink: WithChatId & {
    name?: string;
    subscription_period: number;
    subscription_price: number;
  } & UnknownPayload;
  createForumTopic: WithChatId & {
    name: string;
    icon_color?: number;
    icon_custom_emoji_id?: string;
  } & UnknownPayload;
  createInvoiceLink: StrictTelegramApiMethodPayloads['createInvoiceLink'];
  createNewStickerSet: {
    user_id: number;
    name: string;
    title: string;
    stickers: unknown[];
    sticker_type?: string;
    needs_repainting?: boolean;
  } & UnknownPayload;
  declineChatJoinRequest: WithChatId & { user_id: number } & UnknownPayload;
  declineSuggestedPost: StrictTelegramApiMethodPayloads['declineSuggestedPost'];
  deleteAllMessageReactions: StrictTelegramApiMethodPayloads['deleteAllMessageReactions'];
  deleteBusinessMessages: {
    business_connection_id: string;
    message_ids: number[];
  } & UnknownPayload;
  deleteChatPhoto: WithChatId & {} & UnknownPayload;
  deleteChatStickerSet: WithChatId & {} & UnknownPayload;
  deleteForumTopic: WithChatId & { message_thread_id: number } & UnknownPayload;
  deleteMessage: StrictTelegramApiMethodPayloads['deleteMessage'];
  deleteMessageReaction: StrictTelegramApiMethodPayloads['deleteMessageReaction'];
  deleteMessages: WithChatId & { message_ids: number[] } & UnknownPayload;
  deleteMyCommands: { scope?: unknown; language_code?: string } & UnknownPayload;
  deleteStickerFromSet: { sticker: string } & UnknownPayload;
  deleteStickerSet: { name: string } & UnknownPayload;
  deleteStory: { business_connection_id: string; story_id: number } & UnknownPayload;
  deleteWebhook: StrictTelegramApiMethodPayloads['deleteWebhook'];
  editChatInviteLink: WithChatId & {
    invite_link: string;
    name?: string;
    expire_date?: number;
    member_limit?: number;
    creates_join_request?: boolean;
  } & UnknownPayload;
  editChatSubscriptionInviteLink: WithChatId & {
    invite_link: string;
    name?: string;
  } & UnknownPayload;
  editForumTopic: WithChatId & {
    message_thread_id: number;
    name?: string;
    icon_custom_emoji_id?: string;
  } & UnknownPayload;
  editGeneralForumTopic: WithChatId & { name: string } & UnknownPayload;
  editMessageCaption: WithChatId &
    WithBusinessConnectionId & {
      message_id?: number;
      inline_message_id?: string;
      caption?: string;
      parse_mode?: string;
      caption_entities?: unknown[];
      show_caption_above_media?: boolean;
      reply_markup?: import('./telegram.js').InlineKeyboardMarkup;
    } & UnknownPayload;
  editMessageChecklist: WithChatId & {
    business_connection_id: string;
    message_id: number;
    checklist: unknown;
    reply_markup?: import('./telegram.js').InlineKeyboardMarkup;
  } & UnknownPayload;
  editMessageLiveLocation: WithChatId &
    WithBusinessConnectionId & {
      message_id?: number;
      inline_message_id?: string;
      latitude: number;
      longitude: number;
      live_period?: number;
      horizontal_accuracy?: number;
      heading?: number;
      proximity_alert_radius?: number;
      reply_markup?: import('./telegram.js').InlineKeyboardMarkup;
    } & UnknownPayload;
  editMessageMedia: WithChatId &
    WithBusinessConnectionId & {
      message_id?: number;
      inline_message_id?: string;
      media: unknown;
      reply_markup?: import('./telegram.js').InlineKeyboardMarkup;
    } & UnknownPayload;
  editMessageReplyMarkup: WithChatId &
    WithBusinessConnectionId & {
      message_id?: number;
      inline_message_id?: string;
      reply_markup?: import('./telegram.js').InlineKeyboardMarkup;
    } & UnknownPayload;
  editMessageText: StrictTelegramApiMethodPayloads['editMessageText'];
  editStory: {
    business_connection_id: string;
    story_id: number;
    content: unknown;
    caption?: string;
    parse_mode?: string;
    caption_entities?: unknown[];
    areas?: unknown[];
  } & UnknownPayload;
  editUserStarSubscription: {
    user_id: number;
    telegram_payment_charge_id: string;
    is_canceled: boolean;
  } & UnknownPayload;
  exportChatInviteLink: WithChatId & {} & UnknownPayload;
  forwardMessage: WithChatId &
    WithMessageThreadId &
    WithDirectMessagesTopicId &
    WithSuggestedPostParameters &
    WithDisableNotification &
    WithProtectContent &
    WithMessageEffectId & {
      from_chat_id: number | string;
      video_start_timestamp?: number;
      message_id: number;
    } & UnknownPayload;
  forwardMessages: WithChatId &
    WithMessageThreadId &
    WithDirectMessagesTopicId &
    WithDisableNotification &
    WithProtectContent & { from_chat_id: number | string; message_ids: number[] } & UnknownPayload;
  getAvailableGifts: UnknownPayload;
  getBusinessAccountGifts: {
    business_connection_id: string;
    exclude_unsaved?: boolean;
    exclude_saved?: boolean;
    exclude_unlimited?: boolean;
    exclude_limited_upgradable?: boolean;
    exclude_limited_non_upgradable?: boolean;
    exclude_unique?: boolean;
    exclude_from_blockchain?: boolean;
    sort_by_price?: boolean;
    offset?: string;
    limit?: number;
  } & UnknownPayload;
  getBusinessAccountStarBalance: { business_connection_id: string } & UnknownPayload;
  getBusinessConnection: { business_connection_id: string } & UnknownPayload;
  getChat: WithChatId & {} & UnknownPayload;
  getChatAdministrators: WithChatId & { return_bots?: boolean } & UnknownPayload;
  getChatGifts: WithChatId & {
    exclude_unsaved?: boolean;
    exclude_saved?: boolean;
    exclude_unlimited?: boolean;
    exclude_limited_upgradable?: boolean;
    exclude_limited_non_upgradable?: boolean;
    exclude_from_blockchain?: boolean;
    exclude_unique?: boolean;
    sort_by_price?: boolean;
    offset?: string;
    limit?: number;
  } & UnknownPayload;
  getChatMember: WithChatId & { user_id: number } & UnknownPayload;
  getChatMemberCount: WithChatId & {} & UnknownPayload;
  getChatMenuButton: { chat_id?: number } & UnknownPayload;
  getCustomEmojiStickers: { custom_emoji_ids: string[] } & UnknownPayload;
  getFile: { file_id: string } & UnknownPayload;
  getForumTopicIconStickers: UnknownPayload;
  getGameHighScores: {
    user_id: number;
    chat_id?: number;
    message_id?: number;
    inline_message_id?: string;
  } & UnknownPayload;
  getManagedBotAccessSettings: StrictTelegramApiMethodPayloads['getManagedBotAccessSettings'];
  getManagedBotToken: { user_id: number } & UnknownPayload;
  getMe: UnknownPayload;
  getMyCommands: { scope?: unknown; language_code?: string } & UnknownPayload;
  getMyDefaultAdministratorRights: { for_channels?: boolean } & UnknownPayload;
  getMyDescription: { language_code?: string } & UnknownPayload;
  getMyName: { language_code?: string } & UnknownPayload;
  getMyShortDescription: { language_code?: string } & UnknownPayload;
  getMyStarBalance: UnknownPayload;
  getStarTransactions: { offset?: number; limit?: number } & UnknownPayload;
  getStickerSet: StrictTelegramApiMethodPayloads['getStickerSet'];
  getUpdates: StrictTelegramApiMethodPayloads['getUpdates'];
  getUserChatBoosts: WithChatId & { user_id: number } & UnknownPayload;
  getUserGifts: {
    user_id: number;
    exclude_unlimited?: boolean;
    exclude_limited_upgradable?: boolean;
    exclude_limited_non_upgradable?: boolean;
    exclude_from_blockchain?: boolean;
    exclude_unique?: boolean;
    sort_by_price?: boolean;
    offset?: string;
    limit?: number;
  } & UnknownPayload;
  getUserPersonalChatMessages: { user_id: number; limit: number } & UnknownPayload;
  getUserProfileAudios: { user_id: number; offset?: number; limit?: number } & UnknownPayload;
  getUserProfilePhotos: { user_id: number; offset?: number; limit?: number } & UnknownPayload;
  getWebhookInfo: StrictTelegramApiMethodPayloads['getWebhookInfo'];
  giftPremiumSubscription: {
    user_id: number;
    month_count: number;
    star_count: number;
    text?: string;
    text_parse_mode?: string;
    text_entities?: unknown[];
  } & UnknownPayload;
  hideGeneralForumTopic: WithChatId & {} & UnknownPayload;
  leaveChat: WithChatId & {} & UnknownPayload;
  logOut: UnknownPayload;
  pinChatMessage: WithChatId &
    WithBusinessConnectionId &
    WithDisableNotification & { message_id: number } & UnknownPayload;
  postStory: WithProtectContent & {
    business_connection_id: string;
    content: unknown;
    active_period: number;
    caption?: string;
    parse_mode?: string;
    caption_entities?: unknown[];
    areas?: unknown[];
    post_to_chat_page?: boolean;
  } & UnknownPayload;
  promoteChatMember: WithChatId & {
    user_id: number;
    is_anonymous?: boolean;
    can_manage_chat?: boolean;
    can_delete_messages?: boolean;
    can_manage_video_chats?: boolean;
    can_restrict_members?: boolean;
    can_promote_members?: boolean;
    can_change_info?: boolean;
    can_invite_users?: boolean;
    can_post_stories?: boolean;
    can_edit_stories?: boolean;
    can_delete_stories?: boolean;
    can_post_messages?: boolean;
    can_edit_messages?: boolean;
    can_pin_messages?: boolean;
    can_manage_topics?: boolean;
    can_manage_direct_messages?: boolean;
    can_manage_tags?: boolean;
  } & UnknownPayload;
  readBusinessMessage: {
    business_connection_id: string;
    chat_id: number;
    message_id: number;
  } & UnknownPayload;
  refundStarPayment: { user_id: number; telegram_payment_charge_id: string } & UnknownPayload;
  removeBusinessAccountProfilePhoto: {
    business_connection_id: string;
    is_public?: boolean;
  } & UnknownPayload;
  removeChatVerification: WithChatId & {} & UnknownPayload;
  removeMyProfilePhoto: UnknownPayload;
  removeUserVerification: { user_id: number } & UnknownPayload;
  reopenForumTopic: WithChatId & { message_thread_id: number } & UnknownPayload;
  reopenGeneralForumTopic: WithChatId & {} & UnknownPayload;
  replaceManagedBotToken: StrictTelegramApiMethodPayloads['replaceManagedBotToken'];
  replaceStickerInSet: {
    user_id: number;
    name: string;
    old_sticker: string;
    sticker: unknown;
  } & UnknownPayload;
  restrictChatMember: WithChatId & {
    user_id: number;
    permissions: unknown;
    use_independent_chat_permissions?: boolean;
    until_date?: number;
  } & UnknownPayload;
  revokeChatInviteLink: WithChatId & { invite_link: string } & UnknownPayload;
  savePreparedInlineMessage: {
    user_id: number;
    result: unknown;
    allow_user_chats?: boolean;
    allow_bot_chats?: boolean;
    allow_group_chats?: boolean;
    allow_channel_chats?: boolean;
  } & UnknownPayload;
  savePreparedKeyboardButton: {
    user_id: number;
    button: import('./telegram.js').KeyboardButton;
  } & UnknownPayload;
  sendAnimation: WithChatId &
    WithBusinessConnectionId &
    WithMessageThreadId &
    WithDirectMessagesTopicId &
    WithReplyMarkup &
    WithReplyParameters &
    WithSuggestedPostParameters &
    WithDisableNotification &
    WithProtectContent &
    WithAllowPaidBroadcast &
    WithMessageEffectId & {
      animation: string;
      duration?: number;
      width?: number;
      height?: number;
      thumbnail?: string;
      caption?: string;
      parse_mode?: string;
      caption_entities?: unknown[];
      show_caption_above_media?: boolean;
      has_spoiler?: boolean;
    } & UnknownPayload;
  sendAudio: WithChatId &
    WithBusinessConnectionId &
    WithMessageThreadId &
    WithDirectMessagesTopicId &
    WithReplyMarkup &
    WithReplyParameters &
    WithSuggestedPostParameters &
    WithDisableNotification &
    WithProtectContent &
    WithAllowPaidBroadcast &
    WithMessageEffectId & {
      audio: string;
      caption?: string;
      parse_mode?: string;
      caption_entities?: unknown[];
      duration?: number;
      performer?: string;
      title?: string;
      thumbnail?: string;
    } & UnknownPayload;
  sendChatAction: WithChatId &
    WithBusinessConnectionId &
    WithMessageThreadId & { action: string } & UnknownPayload;
  sendChatJoinRequestWebApp: {
    chat_join_request_query_id: string;
    web_app_url: string;
  } & UnknownPayload;
  sendChecklist: WithChatId &
    WithReplyParameters &
    WithDisableNotification &
    WithProtectContent &
    WithMessageEffectId & {
      business_connection_id: string;
      checklist: unknown;
      reply_markup?: import('./telegram.js').InlineKeyboardMarkup;
    } & UnknownPayload;
  sendContact: WithChatId &
    WithBusinessConnectionId &
    WithMessageThreadId &
    WithDirectMessagesTopicId &
    WithReplyMarkup &
    WithReplyParameters &
    WithSuggestedPostParameters &
    WithDisableNotification &
    WithProtectContent &
    WithAllowPaidBroadcast &
    WithMessageEffectId & {
      phone_number: string;
      first_name: string;
      last_name?: string;
      vcard?: string;
    } & UnknownPayload;
  sendDice: WithChatId &
    WithBusinessConnectionId &
    WithMessageThreadId &
    WithDirectMessagesTopicId &
    WithReplyMarkup &
    WithReplyParameters &
    WithSuggestedPostParameters &
    WithDisableNotification &
    WithProtectContent &
    WithAllowPaidBroadcast &
    WithMessageEffectId & { emoji?: string } & UnknownPayload;
  sendDocument: StrictTelegramApiMethodPayloads['sendDocument'];
  sendGame: WithChatId &
    WithBusinessConnectionId &
    WithMessageThreadId &
    WithReplyParameters &
    WithDisableNotification &
    WithProtectContent &
    WithAllowPaidBroadcast &
    WithMessageEffectId & {
      game_short_name: string;
      reply_markup?: import('./telegram.js').InlineKeyboardMarkup;
    } & UnknownPayload;
  sendGift: WithChatId & {
    user_id?: number;
    gift_id: string;
    pay_for_upgrade?: boolean;
    text?: string;
    text_parse_mode?: string;
    text_entities?: unknown[];
  } & UnknownPayload;
  sendInvoice: StrictTelegramApiMethodPayloads['sendInvoice'];
  sendLivePhoto: StrictTelegramApiMethodPayloads['sendLivePhoto'];
  sendLocation: WithChatId &
    WithBusinessConnectionId &
    WithMessageThreadId &
    WithDirectMessagesTopicId &
    WithReplyMarkup &
    WithReplyParameters &
    WithSuggestedPostParameters &
    WithDisableNotification &
    WithProtectContent &
    WithAllowPaidBroadcast &
    WithMessageEffectId & {
      latitude: number;
      longitude: number;
      horizontal_accuracy?: number;
      live_period?: number;
      heading?: number;
      proximity_alert_radius?: number;
    } & UnknownPayload;
  sendMediaGroup: StrictTelegramApiMethodPayloads['sendMediaGroup'];
  sendMessage: StrictTelegramApiMethodPayloads['sendMessage'];
  sendMessageDraft: WithMessageThreadId & {
    chat_id: number;
    draft_id: number;
    text?: string;
    parse_mode?: string;
    entities?: unknown[];
  } & UnknownPayload;
  sendPaidMedia: WithChatId &
    WithBusinessConnectionId &
    WithMessageThreadId &
    WithDirectMessagesTopicId &
    WithReplyMarkup &
    WithReplyParameters &
    WithSuggestedPostParameters &
    WithDisableNotification &
    WithProtectContent &
    WithAllowPaidBroadcast & {
      star_count: number;
      media: unknown[];
      payload?: string;
      caption?: string;
      parse_mode?: string;
      caption_entities?: unknown[];
      show_caption_above_media?: boolean;
    } & UnknownPayload;
  sendPhoto: StrictTelegramApiMethodPayloads['sendPhoto'];
  sendPoll: StrictTelegramApiMethodPayloads['sendPoll'];
  sendRichMessage: WithChatId &
    WithBusinessConnectionId &
    WithMessageThreadId &
    WithDirectMessagesTopicId &
    WithReplyMarkup &
    WithReplyParameters &
    WithSuggestedPostParameters &
    WithDisableNotification &
    WithProtectContent &
    WithAllowPaidBroadcast &
    WithMessageEffectId & { rich_message: unknown } & UnknownPayload;
  sendRichMessageDraft: WithMessageThreadId & {
    chat_id: number;
    draft_id: number;
    rich_message: unknown;
  } & UnknownPayload;
  sendSticker: StrictTelegramApiMethodPayloads['sendSticker'];
  sendVenue: WithChatId &
    WithBusinessConnectionId &
    WithMessageThreadId &
    WithDirectMessagesTopicId &
    WithReplyMarkup &
    WithReplyParameters &
    WithSuggestedPostParameters &
    WithDisableNotification &
    WithProtectContent &
    WithAllowPaidBroadcast &
    WithMessageEffectId & {
      latitude: number;
      longitude: number;
      title: string;
      address: string;
      foursquare_id?: string;
      foursquare_type?: string;
      google_place_id?: string;
      google_place_type?: string;
    } & UnknownPayload;
  sendVideo: WithChatId &
    WithBusinessConnectionId &
    WithMessageThreadId &
    WithDirectMessagesTopicId &
    WithReplyMarkup &
    WithReplyParameters &
    WithSuggestedPostParameters &
    WithDisableNotification &
    WithProtectContent &
    WithAllowPaidBroadcast &
    WithMessageEffectId & {
      video: string;
      duration?: number;
      width?: number;
      height?: number;
      thumbnail?: string;
      cover?: string;
      start_timestamp?: number;
      caption?: string;
      parse_mode?: string;
      caption_entities?: unknown[];
      show_caption_above_media?: boolean;
      has_spoiler?: boolean;
      supports_streaming?: boolean;
    } & UnknownPayload;
  sendVideoNote: WithChatId &
    WithBusinessConnectionId &
    WithMessageThreadId &
    WithDirectMessagesTopicId &
    WithReplyMarkup &
    WithReplyParameters &
    WithSuggestedPostParameters &
    WithDisableNotification &
    WithProtectContent &
    WithAllowPaidBroadcast &
    WithMessageEffectId & {
      video_note: string;
      duration?: number;
      length?: number;
      thumbnail?: string;
    } & UnknownPayload;
  sendVoice: WithChatId &
    WithBusinessConnectionId &
    WithMessageThreadId &
    WithDirectMessagesTopicId &
    WithReplyMarkup &
    WithReplyParameters &
    WithSuggestedPostParameters &
    WithDisableNotification &
    WithProtectContent &
    WithAllowPaidBroadcast &
    WithMessageEffectId & {
      voice: string;
      caption?: string;
      parse_mode?: string;
      caption_entities?: unknown[];
      duration?: number;
    } & UnknownPayload;
  setBusinessAccountBio: { business_connection_id: string; bio?: string } & UnknownPayload;
  setBusinessAccountGiftSettings: {
    business_connection_id: string;
    show_gift_button: boolean;
    accepted_gift_types: unknown;
  } & UnknownPayload;
  setBusinessAccountName: {
    business_connection_id: string;
    first_name: string;
    last_name?: string;
  } & UnknownPayload;
  setBusinessAccountProfilePhoto: {
    business_connection_id: string;
    photo: unknown;
    is_public?: boolean;
  } & UnknownPayload;
  setBusinessAccountUsername: {
    business_connection_id: string;
    username?: string;
  } & UnknownPayload;
  setChatAdministratorCustomTitle: WithChatId & {
    user_id: number;
    custom_title: string;
  } & UnknownPayload;
  setChatDescription: WithChatId & { description?: string } & UnknownPayload;
  setChatMemberTag: WithChatId & { user_id: number; tag?: string } & UnknownPayload;
  setChatMenuButton: { chat_id?: number; menu_button?: unknown } & UnknownPayload;
  setChatPermissions: WithChatId & {
    permissions: unknown;
    use_independent_chat_permissions?: boolean;
  } & UnknownPayload;
  setChatPhoto: WithChatId & { photo: string } & UnknownPayload;
  setChatStickerSet: WithChatId & { sticker_set_name: string } & UnknownPayload;
  setChatTitle: WithChatId & { title: string } & UnknownPayload;
  setCustomEmojiStickerSetThumbnail: { name: string; custom_emoji_id?: string } & UnknownPayload;
  setGameScore: StrictTelegramApiMethodPayloads['setGameScore'];
  setManagedBotAccessSettings: StrictTelegramApiMethodPayloads['setManagedBotAccessSettings'];
  setMessageReaction: StrictTelegramApiMethodPayloads['setMessageReaction'];
  setMyCommands: { commands: unknown[]; scope?: unknown; language_code?: string } & UnknownPayload;
  setMyDefaultAdministratorRights: { rights?: unknown; for_channels?: boolean } & UnknownPayload;
  setMyDescription: { description?: string; language_code?: string } & UnknownPayload;
  setMyName: { name?: string; language_code?: string } & UnknownPayload;
  setMyProfilePhoto: { photo: unknown } & UnknownPayload;
  setMyShortDescription: { short_description?: string; language_code?: string } & UnknownPayload;
  setPassportDataErrors: { user_id: number; errors: unknown[] } & UnknownPayload;
  setStickerEmojiList: { sticker: string; emoji_list: string[] } & UnknownPayload;
  setStickerKeywords: { sticker: string; keywords?: string[] } & UnknownPayload;
  setStickerMaskPosition: { sticker: string; mask_position?: unknown } & UnknownPayload;
  setStickerPositionInSet: { sticker: string; position: number } & UnknownPayload;
  setStickerSetThumbnail: {
    name: string;
    user_id: number;
    thumbnail?: string;
    format: string;
  } & UnknownPayload;
  setStickerSetTitle: { name: string; title: string } & UnknownPayload;
  setUserEmojiStatus: {
    user_id: number;
    emoji_status_custom_emoji_id?: string;
    emoji_status_expiration_date?: number;
  } & UnknownPayload;
  setWebhook: StrictTelegramApiMethodPayloads['setWebhook'];
  stopMessageLiveLocation: WithChatId &
    WithBusinessConnectionId & {
      message_id?: number;
      inline_message_id?: string;
      reply_markup?: import('./telegram.js').InlineKeyboardMarkup;
    } & UnknownPayload;
  stopPoll: WithChatId &
    WithBusinessConnectionId & {
      message_id: number;
      reply_markup?: import('./telegram.js').InlineKeyboardMarkup;
    } & UnknownPayload;
  transferBusinessAccountStars: {
    business_connection_id: string;
    star_count: number;
  } & UnknownPayload;
  transferGift: {
    business_connection_id: string;
    owned_gift_id: string;
    new_owner_chat_id: number;
    star_count?: number;
  } & UnknownPayload;
  unbanChatMember: WithChatId & { user_id: number; only_if_banned?: boolean } & UnknownPayload;
  unbanChatSenderChat: WithChatId & { sender_chat_id: number } & UnknownPayload;
  unhideGeneralForumTopic: WithChatId & {} & UnknownPayload;
  unpinAllChatMessages: WithChatId & {} & UnknownPayload;
  unpinAllForumTopicMessages: WithChatId & { message_thread_id: number } & UnknownPayload;
  unpinAllGeneralForumTopicMessages: WithChatId & {} & UnknownPayload;
  unpinChatMessage: WithChatId &
    WithBusinessConnectionId & { message_id?: number } & UnknownPayload;
  uploadStickerFile: StrictTelegramApiMethodPayloads['uploadStickerFile'];
  verifyChat: WithChatId & { custom_description?: string } & UnknownPayload;
  verifyUser: { user_id: number; custom_description?: string } & UnknownPayload;
};
