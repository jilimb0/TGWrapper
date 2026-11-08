import type { ApiClient } from '../core/api-client.js';
import type { JsonObject } from '../types/core.js';
import type { InputRichMessage, Message } from '../types/telegram.js';

export interface DraftStreamOptions {
  chatId: number;
  messageThreadId?: number;
  draftId?: number;
  minIntervalMs?: number;
  canStop?: boolean;
  keepOnStop?: boolean;
}

export class ActiveDraftRegistry {
  private static readonly activeSessions = new Map<number, DraftStreamSession>();

  public static register(draftId: number, session: DraftStreamSession): void {
    ActiveDraftRegistry.activeSessions.set(draftId, session);
  }

  public static unregister(draftId: number): void {
    ActiveDraftRegistry.activeSessions.delete(draftId);
  }

  public static handleStop(draftId: number): boolean {
    const session = ActiveDraftRegistry.activeSessions.get(draftId);
    if (session) {
      session.abort('Generation stopped by user');
      ActiveDraftRegistry.activeSessions.delete(draftId);
      return true;
    }
    return false;
  }
}

export class DraftStreamSession {
  private readonly client: ApiClient;
  private readonly chatId: number;
  private readonly messageThreadId: number | undefined;
  public readonly draftId: number;
  private readonly minIntervalMs: number;
  private readonly canStop: boolean;
  private readonly keepOnStop: boolean;

  private currentText = '';
  private currentRichMessage: InputRichMessage | undefined = undefined;
  private isThinking = false;
  private isClosed = false;
  private abortController = new AbortController();

  private lastSentTime = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlightPromise: Promise<unknown> | null = null;
  private hasPendingUpdate = false;

  public constructor(client: ApiClient, options: DraftStreamOptions) {
    this.client = client;
    this.chatId = options.chatId;
    this.messageThreadId = options.messageThreadId;
    this.draftId =
      options.draftId && options.draftId > 0
        ? options.draftId
        : Math.floor(Math.random() * 2_000_000_000) + 1;
    this.minIntervalMs = options.minIntervalMs ?? 350;
    this.canStop = options.canStop ?? true;
    this.keepOnStop = options.keepOnStop ?? false;

    ActiveDraftRegistry.register(this.draftId, this);
  }

  public get signal(): AbortSignal {
    return this.abortController.signal;
  }

  public get isAborted(): boolean {
    return this.abortController.signal.aborted;
  }

  public async thinking(): Promise<void> {
    if (this.isClosed || this.isAborted) return;
    this.isThinking = true;
    this.currentText = '';
    this.currentRichMessage = undefined;
    await this.dispatchDraft();
  }

  public async write(chunk: string): Promise<void> {
    if (this.isClosed || this.isAborted) return;
    this.isThinking = false;
    this.currentText += chunk;
    this.currentRichMessage = undefined;
    this.scheduleOrDispatch();
  }

  public async setRichMessage(richMessage: InputRichMessage): Promise<void> {
    if (this.isClosed || this.isAborted) return;
    this.isThinking = false;
    this.currentRichMessage = richMessage;
    this.scheduleOrDispatch();
  }

  public async pipeFrom(source: AsyncIterable<string>): Promise<Message> {
    try {
      for await (const chunk of source) {
        if (this.isAborted) break;
        await this.write(chunk);
      }
      return await this.complete();
    } catch (error) {
      this.abort(error instanceof Error ? error.message : 'Error during streaming');
      throw error;
    }
  }

  public abort(reason?: string): void {
    if (this.isClosed || this.isAborted) return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.abortController.abort(new Error(reason ?? 'Draft stream aborted'));
    ActiveDraftRegistry.unregister(this.draftId);
  }

  public async complete(finalExtra: JsonObject = {}): Promise<Message> {
    if (this.isClosed) {
      throw new Error('Draft stream already completed');
    }
    this.isClosed = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    ActiveDraftRegistry.unregister(this.draftId);

    if (this.inFlightPromise) {
      try {
        await this.inFlightPromise;
      } catch {
        // Ignore previous draft errors on finalize
      }
    }

    if (this.currentRichMessage) {
      return (await this.client.callApiUnsafe<Message>('sendRichMessage', {
        chat_id: this.chatId,
        ...(this.messageThreadId ? { message_thread_id: this.messageThreadId } : {}),
        rich_message: this.currentRichMessage as unknown as JsonObject,
        ...finalExtra,
      })) as Message;
    }

    return (await this.client.callApiUnsafe<Message>('sendMessage', {
      chat_id: this.chatId,
      text: this.currentText || (this.isThinking ? '...' : ''),
      ...(this.messageThreadId ? { message_thread_id: this.messageThreadId } : {}),
      ...finalExtra,
    })) as Message;
  }

  private scheduleOrDispatch(): void {
    const now = Date.now();
    const elapsed = now - this.lastSentTime;

    if (elapsed >= this.minIntervalMs && !this.inFlightPromise) {
      void this.dispatchDraft();
    } else {
      this.hasPendingUpdate = true;
      if (!this.timer) {
        const wait = Math.max(0, this.minIntervalMs - elapsed);
        this.timer = setTimeout(() => {
          this.timer = null;
          if (this.hasPendingUpdate && !this.inFlightPromise && !this.isClosed && !this.isAborted) {
            void this.dispatchDraft();
          }
        }, wait);
      }
    }
  }

  private async dispatchDraft(): Promise<void> {
    if (this.isClosed || this.isAborted) return;
    this.hasPendingUpdate = false;
    this.lastSentTime = Date.now();

    const payload: JsonObject = {
      chat_id: this.chatId,
      draft_id: this.draftId,
      can_stop: this.canStop,
      keep_on_stop: this.keepOnStop,
    };

    if (this.messageThreadId) {
      payload.message_thread_id = this.messageThreadId;
    }

    let method = 'sendMessageDraft';
    if (this.currentRichMessage) {
      method = 'sendRichMessageDraft';
      payload.rich_message = this.currentRichMessage as unknown as JsonObject;
    } else {
      payload.text = this.isThinking ? '' : this.currentText;
    }

    this.inFlightPromise = this.client.callApiUnsafe<boolean>(method, payload).catch(() => {
      // Ephemeral draft network failure shouldn't crash the session
      return false;
    });

    try {
      await this.inFlightPromise;
    } finally {
      this.inFlightPromise = null;
      if (this.hasPendingUpdate && !this.isClosed && !this.isAborted) {
        this.scheduleOrDispatch();
      }
    }
  }
}
