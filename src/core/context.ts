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
    const maybeMessage = this.update.message;
    if (maybeMessage && 'text' in maybeMessage) {
      return maybeMessage as Message.TextMessage;
    }
    return undefined;
  }

  public get callbackQuery(): CallbackQuery | undefined {
    return this.update.callback_query;
  }

  public get fromId(): number | undefined {
    if (this.update.message?.from) {
      return this.update.message.from.id;
    }
    if (this.update.callback_query?.from) {
      return this.update.callback_query.from.id;
    }
    return undefined;
  }

  public async reply(text: string, extra: JsonObject = {}): Promise<unknown> {
    const chatId = this.update.message?.chat.id ?? this.update.callback_query?.message?.chat.id;
    if (!chatId) {
      throw new Error('Cannot reply without chat id in update.');
    }

    return this.apiClient.callApi('sendMessage', {
      chat_id: chatId,
      text,
      ...extra
    });
  }

  public async editMessage(text: string, extra: JsonObject = {}): Promise<unknown> {
    const callbackMessage = this.update.callback_query?.message;
    if (!callbackMessage) {
      throw new Error('Cannot edit message without callback_query.message.');
    }

    return this.apiClient.callApi('editMessageText', {
      chat_id: callbackMessage.chat.id,
      message_id: callbackMessage.message_id,
      text,
      ...extra
    });
  }

  public async answerCallbackQuery(text?: string): Promise<unknown> {
    const callbackQueryId = this.update.callback_query?.id;
    if (!callbackQueryId) {
      throw new Error('Cannot answer callback query for non-callback update.');
    }

    return this.apiClient.callApi('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text
    });
  }
}
