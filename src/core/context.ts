import type { ApiClient } from './api-client.js';
import type { JsonObject, SessionEnvelope } from '../types/core.js';
import type { CallbackQuery, Message, Update } from '../types/telegram.js';

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
      this.update.my_chat_member?.from;

    if (directFrom) {
      return directFrom.id;
    }

    const reactionActor = this.update.message_reaction?.user;
    if (reactionActor) {
      return reactionActor.id;
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

    return this.apiClient.callApi('sendMessage', {
      chat_id: chatId,
      text,
      ...extra
    });
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
      ...extra
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
      ...extra
    });
  }

  public async editMessageReplyMarkup(replyMarkup: JsonObject): Promise<unknown> {
    const targetMessage = this.update.callback_query?.message ?? this.primaryMessage;
    if (!targetMessage) {
      throw new Error('Cannot edit reply markup: update has no resolvable message.');
    }

    return this.apiClient.editMessageReplyMarkup({
      chat_id: targetMessage.chat.id,
      message_id: targetMessage.message_id,
      reply_markup: replyMarkup
    });
  }

  public async answerCallbackQuery(text?: string): Promise<unknown> {
    const callbackQueryId = this.update.callback_query?.id;
    if (!callbackQueryId) {
      throw new Error('Cannot answer callback query for non-callback update.');
    }

    return this.apiClient.callApi('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      ...(text === undefined ? {} : { text })
    });
  }

  private get primaryMessage(): Message | undefined {
    return (
      this.update.message ??
      this.update.edited_message ??
      this.update.channel_post ??
      this.update.edited_channel_post ??
      this.update.business_message ??
      this.update.edited_business_message
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

    return undefined;
  }
}
