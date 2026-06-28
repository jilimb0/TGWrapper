import type { BinaryInput } from '../core/api-client.js';
import type { BotClient, BotEventHandler, BotEventName } from '../core/bot-client.js';
import type { Update } from '../types/telegram.js';
import type { TelegramApiMethodPayloads } from '../types/telegram.payloads.generated.js';
import type { TelegramApiMethodResults as MethodResults } from '../types/telegram.results.generated.js';
import { createCallbackUpdate, createMessageUpdate } from './update-factory.js';

export interface MockBotCall {
  method: string;
  payload: Record<string, unknown>;
}

export class MockBotClient implements BotClient {
  private readonly handlers: { [K in BotEventName]: Set<BotEventHandler<K>> } = {
    update: new Set(),
    message: new Set(),
    callback_query: new Set(),
    error: new Set(),
    api_call: new Set(),
    api_result: new Set(),
    api_error: new Set(),
  };
  private readonly callsLog: MockBotCall[] = [];
  private running = false;

  public on<TEvent extends BotEventName>(
    event: TEvent,
    handler: BotEventHandler<TEvent>,
  ): () => void {
    (this.handlers[event] as Set<BotEventHandler<TEvent>>).add(handler);
    return () => {
      (this.handlers[event] as Set<BotEventHandler<TEvent>>).delete(handler);
    };
  }

  public onError(handler: (error: unknown) => void | Promise<void>): () => void {
    return this.on('error', handler);
  }

  public async start(): Promise<void> {
    this.running = true;
  }

  public async stop(): Promise<void> {
    this.running = false;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public ingest(update: unknown): void {
    void this.emitUpdate(update as Update);
  }

  public async emitUpdate(update: Update): Promise<void> {
    await this.emit('update', update);
    if (update.message) {
      await this.emit('message', update.message);
    }
    if (update.callback_query) {
      await this.emit('callback_query', update.callback_query);
    }
  }

  public async simulateCommand(command: string, chatId = 1, userId = 1): Promise<void> {
    await this.emitUpdate(
      createMessageUpdate({
        chatId,
        userId,
        text: command,
      }),
    );
  }

  public async sendMessage(
    chatId: number | string,
    text: string,
    extra: Omit<TelegramApiMethodPayloads['sendMessage'], 'chat_id' | 'text'> = {},
  ): Promise<MethodResults['sendMessage']> {
    this.callsLog.push({ method: 'sendMessage', payload: { chat_id: chatId, text, ...extra } });
    return true as unknown as MethodResults['sendMessage'];
  }

  public async sendDocument(
    chatId: number | string,
    document: BinaryInput,
    extra: Omit<TelegramApiMethodPayloads['sendDocument'], 'chat_id' | 'document'> = {},
  ): Promise<MethodResults['sendDocument']> {
    this.callsLog.push({
      method: 'sendDocument',
      payload: { chat_id: chatId, document, ...extra },
    });
    return true as unknown as MethodResults['sendDocument'];
  }

  public async answerCallbackQuery(
    callbackQueryId: string,
    extra: Omit<TelegramApiMethodPayloads['answerCallbackQuery'], 'callback_query_id'> = {},
  ): Promise<MethodResults['answerCallbackQuery']> {
    this.callsLog.push({
      method: 'answerCallbackQuery',
      payload: { callback_query_id: callbackQueryId, ...extra },
    });
    return true as unknown as MethodResults['answerCallbackQuery'];
  }

  public async editMessageText(
    payload: TelegramApiMethodPayloads['editMessageText'],
  ): Promise<MethodResults['editMessageText']> {
    this.callsLog.push({
      method: 'editMessageText',
      payload: payload as unknown as Record<string, unknown>,
    });
    return true as unknown as MethodResults['editMessageText'];
  }

  public async editMessageReplyMarkup(
    payload: TelegramApiMethodPayloads['editMessageReplyMarkup'],
  ): Promise<MethodResults['editMessageReplyMarkup']> {
    this.callsLog.push({
      method: 'editMessageReplyMarkup',
      payload: payload as unknown as Record<string, unknown>,
    });
    return true as unknown as MethodResults['editMessageReplyMarkup'];
  }

  public async getFileLink(fileId: string): Promise<string> {
    this.callsLog.push({ method: 'getFileLink', payload: { file_id: fileId } });
    return `https://api.telegram.org/file/botTEST/${fileId}`;
  }

  public get calls(): readonly MockBotCall[] {
    return this.callsLog;
  }

  public reset(): void {
    this.callsLog.length = 0;
  }

  public createMessageUpdate = createMessageUpdate;
  public createCallbackUpdate = createCallbackUpdate;

  private async emit<TEvent extends BotEventName>(
    event: TEvent,
    payload: Parameters<BotEventHandler<TEvent>>[0],
  ): Promise<void> {
    for (const handler of this.handlers[event]) {
      await handler(payload as never);
    }
  }
}
