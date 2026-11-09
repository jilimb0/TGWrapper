import { DraftStreamSession } from '../runtime/draft-stream.js';
import type { HtmlBubblePayload } from '../tma/bubbles.js';
import { createWidgetPayload, type NativeWidgetOptions } from '../tma/widgets.js';
import type { JsonObject, SessionEnvelope } from '../types/core.js';
import type {
  CallbackQuery,
  InlineKeyboardMarkup,
  InputRichMessage,
  Message,
  SentGuestMessage,
  SharedWidgetQuery,
  Update,
  WidgetQuery,
} from '../types/telegram.js';
import type { ApiClient } from './api-client.js';

interface SceneController {
  enter(nextState: string): Promise<void>;
  leave(): Promise<void>;
}

export class Context<TState extends string, TData extends JsonObject> {
  public readonly update: Update;
  public readonly state: JsonObject;
  public readonly session: SessionEnvelope<TState, TData>;
  public readonly scene: SceneController;

  private readonly apiClient: ApiClient;

  public constructor(params: {
    update: Update;
    state?: JsonObject;
    session: SessionEnvelope<TState, TData>;
    sceneController: SceneController;
    apiClient: ApiClient;
  }) {
    this.update = params.update;
    this.state = params.state ?? {};
    this.session = params.session;
    this.scene = params.sceneController;
    this.apiClient = params.apiClient;
  }

  public get api(): ApiClient {
    return this.apiClient;
  }

  public get message(): Message.TextMessage | undefined {
    const maybeMessage = this.primaryMessage;
    if (maybeMessage && 'text' in maybeMessage) {
      return maybeMessage as Message.TextMessage;
    }
    return undefined;
  }

  public get anyMessage(): Message | undefined {
    return this.primaryMessage ?? this.update.callback_query?.message;
  }

  public get callbackQuery(): CallbackQuery | undefined {
    return this.update.callback_query;
  }

  public get preCheckoutQuery() {
    return this.update.pre_checkout_query;
  }

  public get successfulPayment() {
    const msg = this.primaryMessage;
    if (msg && 'successful_payment' in msg) {
      return (msg as Record<string, unknown>).successful_payment;
    }
    return undefined;
  }

  public get guestMessage(): Message | undefined {
    return this.update.guest_message;
  }

  public get stoppedDraft(): import('../types/telegram.js').MessageGenerationStopped | undefined {
    return this.update.stopped_message_generation;
  }

  public get managedBot(): import('../types/telegram.js').ManagedBotUpdated | undefined {
    return this.update.managed_bot;
  }

  public get subscription(): import('../types/telegram.js').BotSubscriptionUpdated | undefined {
    return this.update.subscription;
  }

  public get widgetQuery(): WidgetQuery | undefined {
    return this.update.widget_query;
  }

  public get sharedWidgetQuery(): SharedWidgetQuery | undefined {
    return this.update.shared_widget_query;
  }

  public get anyWidgetQuery(): WidgetQuery | SharedWidgetQuery | undefined {
    return this.update.widget_query ?? this.update.shared_widget_query;
  }

  public get fromId(): number | undefined {
    const directFrom =
      this.primaryMessage?.from ??
      this.update.callback_query?.from ??
      this.update.inline_query?.from ??
      this.update.business_connection?.user ??
      this.update.poll_answer?.user ??
      this.update.chosen_inline_result?.from ??
      this.update.shipping_query?.from ??
      this.update.pre_checkout_query?.from ??
      this.update.chat_join_request?.from ??
      this.update.chat_member?.from ??
      this.update.my_chat_member?.from ??
      this.update.subscription?.user ??
      this.update.managed_bot?.user ??
      this.update.widget_query?.from ??
      this.update.shared_widget_query?.from ??
      this.update.guest_message?.guest_bot_caller_user;

    if (directFrom) {
      return directFrom.id;
    }

    const reactionActor = this.update.message_reaction?.user;
    if (reactionActor) {
      return reactionActor.id;
    }

    const paidMediaBuyer = this.update.purchased_paid_media?.from;
    if (paidMediaBuyer) {
      return paidMediaBuyer.id;
    }

    return undefined;
  }

  public get chatId(): number | undefined {
    return this.resolveChatId();
  }

  public async reply(text: string, extra: JsonObject = {}): Promise<unknown> {
    const chatId = this.resolveChatId();
    if (!chatId) {
      throw new Error('Cannot reply: update has no resolvable chat id.');
    }

    return this.apiClient.sendMessage(chatId, text, extra);
  }

  public async editMessage(text: string, extra: JsonObject = {}): Promise<unknown> {
    const targetMessage = this.update.callback_query?.message ?? this.primaryMessage;
    if (!targetMessage) {
      throw new Error('Cannot edit message: update has no resolvable message.');
    }

    return this.apiClient.editMessageText({
      chat_id: targetMessage.chat.id,
      message_id: targetMessage.message_id,
      text,
      ...extra,
    });
  }

  public async editMessageCaption(caption: string, extra: JsonObject = {}): Promise<unknown> {
    const targetMessage = this.update.callback_query?.message ?? this.primaryMessage;
    if (!targetMessage) {
      throw new Error('Cannot edit caption: update has no resolvable message.');
    }

    return this.apiClient.editMessageCaption({
      chat_id: targetMessage.chat.id,
      message_id: targetMessage.message_id,
      caption,
      ...extra,
    });
  }

  public async editMessageReplyMarkup(replyMarkup: InlineKeyboardMarkup): Promise<unknown> {
    const targetMessage = this.update.callback_query?.message ?? this.primaryMessage;
    if (!targetMessage) {
      throw new Error('Cannot edit reply markup: update has no resolvable message.');
    }

    return this.apiClient.editMessageReplyMarkup({
      chat_id: targetMessage.chat.id,
      message_id: targetMessage.message_id,
      reply_markup: replyMarkup,
    });
  }

  public async answerCallbackQuery(text?: string): Promise<unknown> {
    const callbackQueryId = this.update.callback_query?.id;
    if (!callbackQueryId) {
      throw new Error('Cannot answer callback query for non-callback update.');
    }

    return this.apiClient.answerCallbackQuery(callbackQueryId, text === undefined ? {} : { text });
  }

  public async answerPreCheckoutQuery(ok: boolean, errorMessage?: string): Promise<unknown> {
    const preCheckoutQueryId = this.update.pre_checkout_query?.id;
    if (!preCheckoutQueryId) {
      throw new Error('Cannot answer pre-checkout query for non-pre_checkout_query update.');
    }

    const payload: JsonObject = {
      pre_checkout_query_id: preCheckoutQueryId,
      ok,
    };
    if (errorMessage !== undefined) {
      payload.error_message = errorMessage;
    }

    return this.apiClient.callApiUnsafe('answerPreCheckoutQuery', payload);
  }

  public streamReply(options: {
    draftId?: number;
    minIntervalMs?: number;
    canStop?: boolean;
    keepOnStop?: boolean;
    messageThreadId?: number;
  } = {}): DraftStreamSession {
    const chatId = this.resolveChatId();
    if (!chatId) {
      throw new Error('Cannot stream reply: update has no resolvable chat id.');
    }

    return new DraftStreamSession(this.apiClient, {
      chatId,
      ...options,
    });
  }

  public async replyRich(richMessage: InputRichMessage, extra: JsonObject = {}): Promise<Message> {
    const chatId = this.resolveChatId();
    if (!chatId) {
      throw new Error('Cannot reply: update has no resolvable chat id.');
    }

    return (await this.apiClient.callApiUnsafe<Message>('sendRichMessage', {
      chat_id: chatId,
      rich_message: richMessage as unknown as JsonObject,
      ...extra,
    })) as Message;
  }

  public async replyEphemeral(
    text: string,
    options: {
      receiverUserId?: number;
      callbackQueryId?: string;
      replaceCallbackQueryMessage?: boolean;
      extra?: JsonObject;
    } = {},
  ): Promise<Message> {
    const chatId = this.resolveChatId();
    if (!chatId) {
      throw new Error('Cannot reply ephemeral: update has no resolvable chat id.');
    }

    const receiverUserId = options.receiverUserId ?? this.fromId;
    const callbackQueryId = options.callbackQueryId ?? this.update.callback_query?.id;
    if (!receiverUserId && !callbackQueryId) {
      throw new Error('Cannot reply ephemeral: cannot determine receiver_user_id or callback_query_id.');
    }

    const ephemeralParams: JsonObject = {
      ...(receiverUserId ? { receiver_user_id: receiverUserId } : {}),
      ...(callbackQueryId ? { callback_query_id: callbackQueryId } : {}),
      ...(options.replaceCallbackQueryMessage !== undefined
        ? { replace_callback_query_message: options.replaceCallbackQueryMessage }
        : {}),
    };

    return (await this.apiClient.callApiUnsafe<Message>('sendMessage', {
      chat_id: chatId,
      text,
      ephemeral_message_parameters: ephemeralParams,
      ...(options.extra ?? {}),
    })) as Message;
  }

  public async deleteEphemeral(
    ephemeralMessageId: number,
    receiverUserId?: number,
  ): Promise<boolean> {
    const chatId = this.resolveChatId();
    if (!chatId) {
      throw new Error('Cannot delete ephemeral: update has no resolvable chat id.');
    }

    const targetUserId = receiverUserId ?? this.fromId;
    if (!targetUserId) {
      throw new Error('Cannot delete ephemeral: cannot determine receiver_user_id.');
    }

    return this.apiClient.callApiUnsafe<boolean>('deleteEphemeralMessage', {
      chat_id: chatId,
      receiver_user_id: targetUserId,
      ephemeral_message_id: ephemeralMessageId,
    });
  }

  public async answerGuestQuery(result: unknown): Promise<SentGuestMessage> {
    const guestQueryId =
      this.update.guest_message?.guest_query_id ??
      (this.update.guest_message as Record<string, unknown> | undefined)?.guest_query_id;

    if (!guestQueryId) {
      throw new Error('Cannot answer guest query: update contains no guest_query_id.');
    }

    return this.apiClient.callApiUnsafe<SentGuestMessage>('answerGuestQuery', {
      guest_query_id: String(guestQueryId),
      result: result as unknown as import('../types/core.js').JsonValue,
    });
  }

  public async replyHtmlBubble(bubble: HtmlBubblePayload, extra: JsonObject = {}): Promise<unknown> {
    const chatId = this.resolveChatId();
    if (!chatId) {
      throw new Error('Cannot reply HTML bubble: update has no resolvable chat id.');
    }

    // Deliver bubble bundle as message text / rich payload with HTML formatting
    return this.apiClient.callApiUnsafe('sendMessage', {
      chat_id: chatId,
      text: bubble.bundle,
      parse_mode: 'HTML',
      ...extra,
    });
  }

  public async answerWidgetQuery(data?: string): Promise<boolean> {
    const queryId = this.update.widget_query?.id ?? this.update.shared_widget_query?.id;
    if (!queryId) {
      throw new Error('Cannot answer widget query: update has no widget_query or shared_widget_query.');
    }

    const payload: JsonObject = { widget_query_id: queryId };
    if (data !== undefined) {
      payload.data = data;
    }

    return Boolean(await this.apiClient.callApiUnsafe('answerWidgetQuery', payload));
  }

  public async replyWidget(
    options: NativeWidgetOptions & { extra?: JsonObject },
  ): Promise<Message> {
    const chatId = this.resolveChatId();
    if (!chatId) {
      throw new Error('Cannot send widget: update has no resolvable chat id.');
    }

    const payload = createWidgetPayload(options);
    return (await this.apiClient.callApiUnsafe('sendWidget', {
      chat_id: chatId,
      ...payload,
      ...(options.extra ?? {}),
    })) as Message;
  }

  public async replySharedWidget(
    widgetId: string,
    options: {
      width?: number;
      height?: number;
      chatData?: string;
      caption?: string;
      parseMode?: string;
      disableNotification?: boolean;
      protectContent?: boolean;
      extra?: JsonObject;
    } = {},
  ): Promise<Message> {
    const chatId = this.resolveChatId();
    if (!chatId) {
      throw new Error('Cannot send shared widget: update has no resolvable chat id.');
    }

    return (await this.apiClient.callApiUnsafe('sendSharedWidget', {
      chat_id: chatId,
      widget_id: widgetId,
      ...(options.width !== undefined ? { width: options.width } : {}),
      ...(options.height !== undefined ? { height: options.height } : {}),
      ...(options.chatData !== undefined ? { chat_data: options.chatData } : {}),
      ...(options.caption !== undefined ? { caption: options.caption } : {}),
      ...(options.parseMode !== undefined ? { parse_mode: options.parseMode } : {}),
      ...(options.disableNotification !== undefined
        ? { disable_notification: options.disableNotification }
        : {}),
      ...(options.protectContent !== undefined ? { protect_content: options.protectContent } : {}),
      ...(options.extra ?? {}),
    })) as Message;
  }

  public async editWidgetData(options: { publicData?: string; chatData?: string }): Promise<boolean> {
    const wq = this.update.widget_query;
    const chatId = wq?.chat?.id ?? this.resolveChatId();
    const messageId = wq?.message_id ?? this.primaryMessage?.message_id;
    const inlineMessageId = wq?.inline_message_id;

    if (!inlineMessageId && (!chatId || !messageId)) {
      throw new Error('Cannot edit widget data: missing chat_id/message_id or inline_message_id.');
    }

    const payload: JsonObject = {
      ...(inlineMessageId
        ? { inline_message_id: inlineMessageId }
        : { chat_id: chatId, message_id: messageId }),
      ...(options.publicData !== undefined ? { public_data: options.publicData } : {}),
      ...(options.chatData !== undefined ? { chat_data: options.chatData } : {}),
    };

    return Boolean(await this.apiClient.callApiUnsafe('editMessageWidgetData', payload));
  }

  public async editSharedWidget(
    widgetId: string,
    publicData: string,
    cacheTime?: number,
  ): Promise<boolean> {
    const payload: JsonObject = {
      widget_id: widgetId,
      public_data: publicData,
      ...(cacheTime !== undefined ? { cache_time: cacheTime } : {}),
    };

    return Boolean(await this.apiClient.callApiUnsafe('editSharedWidgetData', payload));
  }

  private get primaryMessage(): Message | undefined {
    return (
      this.update.message ??
      this.update.edited_message ??
      this.update.channel_post ??
      this.update.edited_channel_post ??
      this.update.business_message ??
      this.update.edited_business_message ??
      this.update.guest_message
    );
  }

  private resolveChatId(): number | undefined {
    if (this.primaryMessage?.chat?.id) {
      return this.primaryMessage.chat.id;
    }

    if (this.update.callback_query?.message?.chat?.id) {
      return this.update.callback_query.message.chat.id;
    }

    if (this.update.chat_join_request?.chat?.id) {
      return this.update.chat_join_request.chat.id;
    }

    if (this.update.chat_member?.chat?.id) {
      return this.update.chat_member.chat.id;
    }

    if (this.update.my_chat_member?.chat?.id) {
      return this.update.my_chat_member.chat.id;
    }

    if (this.update.message_reaction?.chat?.id) {
      return this.update.message_reaction.chat.id;
    }

    if (this.update.message_reaction_count?.chat?.id) {
      return this.update.message_reaction_count.chat.id;
    }

    if (this.update.removed_chat_boost?.chat?.id) {
      return this.update.removed_chat_boost.chat.id;
    }

    if (this.update.chat_boost?.chat?.id) {
      return this.update.chat_boost.chat.id;
    }

    if (this.update.deleted_business_messages?.chat?.id) {
      return this.update.deleted_business_messages.chat.id;
    }

    if (this.update.poll_answer?.voter_chat?.id) {
      return this.update.poll_answer.voter_chat.id;
    }

    if (this.update.stopped_message_generation?.chat?.id) {
      return this.update.stopped_message_generation.chat.id;
    }

    if (this.update.widget_query?.chat?.id) {
      return this.update.widget_query.chat.id;
    }

    return undefined;
  }
}
