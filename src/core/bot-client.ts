import { BotRuntime } from '../runtime/bot-runtime.js';
import type {
  ApiCallEvent,
  ApiErrorEvent,
  ApiResultEvent,
  JsonObject,
  Logger,
  MetricsCollector,
  RuntimeHooks,
  RuntimeLifecycle,
} from '../types/core.js';
import type { CallbackQuery, Message, Update } from '../types/telegram.js';
import type { TelegramApiMethodPayloads } from '../types/telegram.payloads.generated.js';
import type { TelegramApiMethodResults } from '../types/telegram.results.generated.js';
import { PollingSource } from '../update-loop/polling.js';
import { WebhookSource } from '../update-loop/webhook.js';
import type { BinaryInput } from './api-client.js';
import { ApiClient } from './api-client.js';

export type BotClientEventMap = {
  update: Update;
  message: Message;
  callback_query: CallbackQuery;
  error: unknown;
  api_call: ApiCallEvent;
  api_result: ApiResultEvent;
  api_error: ApiErrorEvent;
};

export type BotEventName = keyof BotClientEventMap;
export type BotEventHandler<TEvent extends BotEventName> = (
  event: BotClientEventMap[TEvent],
) => void | Promise<void>;

export interface CreateBotClientOptions {
  token: string;
  mode?: 'polling' | 'webhook';
  polling?: {
    timeoutSeconds?: number;
    limit?: number;
    dropPendingUpdates?: boolean;
    signal?: AbortSignal;
  };
  hooks?: RuntimeHooks;
  logger?: Logger;
  metrics?: MetricsCollector;
  baseUrl?: string;
}

export interface BotClient extends RuntimeLifecycle {
  on<TEvent extends BotEventName>(event: TEvent, handler: BotEventHandler<TEvent>): () => void;
  ingest(update: unknown): void;
  sendMessage(
    chatId: number | string,
    text: string,
    extra?: Omit<TelegramApiMethodPayloads['sendMessage'], 'chat_id' | 'text'>,
  ): Promise<TelegramApiMethodResults['sendMessage']>;
  sendDocument(
    chatId: number | string,
    document: BinaryInput | TelegramApiMethodPayloads['sendDocument']['document'],
    extra?: Omit<TelegramApiMethodPayloads['sendDocument'], 'chat_id' | 'document'>,
  ): Promise<TelegramApiMethodResults['sendDocument']>;
  answerCallbackQuery(
    callbackQueryId: string,
    extra?: Omit<TelegramApiMethodPayloads['answerCallbackQuery'], 'callback_query_id'>,
  ): Promise<TelegramApiMethodResults['answerCallbackQuery']>;
  editMessageText(
    payload: TelegramApiMethodPayloads['editMessageText'],
  ): Promise<TelegramApiMethodResults['editMessageText']>;
  editMessageReplyMarkup(
    payload: TelegramApiMethodPayloads['editMessageReplyMarkup'],
  ): Promise<TelegramApiMethodResults['editMessageReplyMarkup']>;
  getFileLink(fileId: string): Promise<string>;
}

export function createBotClient(options: CreateBotClientOptions): BotClient {
  const handlers: {
    [K in BotEventName]: Set<BotEventHandler<K>>;
  } = {
    update: new Set(),
    message: new Set(),
    callback_query: new Set(),
    error: new Set(),
    api_call: new Set(),
    api_result: new Set(),
    api_error: new Set(),
  };

  const emit = async <TEvent extends BotEventName>(
    event: TEvent,
    payload: BotClientEventMap[TEvent],
  ): Promise<void> => {
    for (const handler of handlers[event]) {
      await handler(payload as never);
    }
  };

  const apiClient = new ApiClient({
    token: options.token,
    ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
    ...(options.logger ? { logger: options.logger } : {}),
    ...(options.metrics ? { metrics: options.metrics } : {}),
    onApiCall: async (event) => {
      await emit('api_call', event);
    },
    onApiResult: async (event) => {
      await emit('api_result', event);
    },
    onApiError: async (event) => {
      await emit('api_error', event);
    },
  });

  const mode = options.mode ?? 'polling';
  const source =
    mode === 'webhook'
      ? new WebhookSource()
      : new PollingSource(apiClient, {
          ...(options.polling?.timeoutSeconds !== undefined
            ? { timeoutSeconds: options.polling.timeoutSeconds }
            : {}),
          ...(options.polling?.limit !== undefined ? { limit: options.polling.limit } : {}),
          ...(options.polling?.dropPendingUpdates !== undefined
            ? { dropPendingUpdates: options.polling.dropPendingUpdates }
            : {}),
          ...(options.polling?.signal ? { signal: options.polling.signal } : {}),
        });

  const runtime = new BotRuntime(
    source,
    {
      handleUpdate: async (update) => {
        await emit('update', update);
        if (update.message) {
          await emit('message', update.message);
        }
        if (update.callback_query) {
          await emit('callback_query', update.callback_query);
        }
      },
    },
    {
      ...(options.logger ? { logger: options.logger } : {}),
      ...(options.metrics ? { metrics: options.metrics } : {}),
      ...(options.hooks ? { hooks: options.hooks } : {}),
    },
  );

  runtime.onError(async (error) => {
    await emit('error', error);
  });

  return {
    start: async () => {
      await runtime.start();
    },
    stop: async () => {
      await runtime.stop();
    },
    isRunning: () => runtime.isRunning(),
    onError: (handler) => runtime.onError(handler),
    on: (event, handler) => {
      (handlers[event] as Set<BotEventHandler<typeof event>>).add(
        handler as BotEventHandler<typeof event>,
      );
      return () => {
        (handlers[event] as Set<BotEventHandler<typeof event>>).delete(
          handler as BotEventHandler<typeof event>,
        );
      };
    },
    ingest: (update) => {
      if (source instanceof WebhookSource) {
        source.ingest(update);
      }
    },
    sendMessage: async (chatId, text, extra = {}) => {
      return apiClient.sendMessage(chatId, text, extra as unknown as JsonObject);
    },
    sendDocument: async (chatId, document, extra = {}) => {
      return apiClient.sendDocument(
        chatId,
        document as BinaryInput,
        extra as unknown as JsonObject,
      );
    },
    answerCallbackQuery: async (callbackQueryId, extra = {}) => {
      return apiClient.answerCallbackQuery(callbackQueryId, extra as unknown as JsonObject);
    },
    editMessageText: async (payload) => {
      return apiClient.editMessageText(payload);
    },
    editMessageReplyMarkup: async (payload) => {
      return apiClient.editMessageReplyMarkup(payload);
    },
    getFileLink: async (fileId) => {
      return apiClient.getFileLink(fileId);
    },
  };
}
