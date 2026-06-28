import type { ApiClientOptions, JsonObject, RetryOptions } from '../types/core.js';
import type { TelegramApiMethodPayloads } from '../types/telegram.payloads.generated.js';
import type { TelegramApiMethodResults } from '../types/telegram.results.generated.js';
import type { TelegramApiMethodName } from '../types/telegram.schema.generated.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { CircuitOpenError, CoreError, TelegramApiError } from './errors.js';

const DEFAULT_RETRY: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 300,
  maxDelayMs: 5_000,
  jitterRatio: 0.2,
};

export class ApiClient {
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly logger?: ApiClientOptions['logger'];
  private readonly metrics?: ApiClientOptions['metrics'];
  private readonly retry: RetryOptions;
  private readonly fetchImpl: typeof fetch;
  private readonly mockResponder?: ApiClientOptions['mockResponder'];
  private readonly circuitBreaker: CircuitBreaker;
  private readonly onApiCall?: ApiClientOptions['onApiCall'];
  private readonly onApiResult?: ApiClientOptions['onApiResult'];
  private readonly onApiError?: ApiClientOptions['onApiError'];

  public constructor(options: ApiClientOptions) {
    this.token = options.token;
    this.baseUrl = options.baseUrl ?? 'https://api.telegram.org';
    this.logger = options.logger;
    this.metrics = options.metrics;
    this.retry = { ...DEFAULT_RETRY, ...options.retry };
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.mockResponder = options.mockResponder;
    this.circuitBreaker = new CircuitBreaker(options.circuitBreaker);
    this.onApiCall = options.onApiCall;
    this.onApiResult = options.onApiResult;
    this.onApiError = options.onApiError;
  }

  public async callApi<
    TMethod extends TelegramApiMethodName,
    TResponse = TelegramApiMethodResults[TMethod],
  >(method: TMethod, payload: TelegramApiMethodPayloads[TMethod]): Promise<TResponse> {
    return this.callApiUnsafe(method, payload as JsonObject);
  }

  public async callApiUnsafe<TResponse = unknown>(
    method: string,
    payload: JsonObject,
  ): Promise<TResponse> {
    const requestId = crypto.randomUUID();
    const started = Date.now();

    for (let attempt = 1; attempt <= this.retry.maxRetries + 1; attempt += 1) {
      try {
        await this.onApiCall?.({
          requestId,
          method,
          attempt,
          payload,
        });
        this.circuitBreaker.beforeRequest(Date.now());
        const response = await this.executeRequest<TResponse>(method, payload);
        const durationMs = Date.now() - started;
        this.circuitBreaker.onSuccess();
        await this.onApiResult?.({
          requestId,
          method,
          attempt,
          durationMs,
        });

        this.metrics?.observe('telegram_api_latency_ms', durationMs, { method });

        this.logger?.log({
          level: 'info',
          event: 'telegram_api_call_success',
          timestamp: new Date().toISOString(),
          requestId,
          data: {
            method,
            attempt,
            duration_ms: durationMs,
          },
        });
        return response;
      } catch (error: unknown) {
        if (error instanceof CircuitOpenError) {
          this.metrics?.increment('circuit_breaker_open_count', 1, { method });
        } else {
          this.circuitBreaker.onFailure(Date.now());
        }

        const retryDelay = this.resolveRetryDelay(error, attempt);
        const shouldRetry = retryDelay !== null && attempt <= this.retry.maxRetries;
        await this.onApiError?.({
          requestId,
          method,
          attempt,
          durationMs: Date.now() - started,
          retrying: shouldRetry,
          retryDelayMs: retryDelay ?? 0,
          error,
        });
        if (shouldRetry) {
          this.metrics?.increment('transport_retries', 1, { method });
        }

        this.logger?.log({
          level: 'error',
          event: 'telegram_api_call_error',
          timestamp: new Date().toISOString(),
          requestId,
          data: {
            method,
            attempt,
            duration_ms: Date.now() - started,
            retry_ms: retryDelay ?? 0,
            retrying: shouldRetry,
            message: error instanceof Error ? error.message : 'unknown',
          },
        });

        if (!shouldRetry) {
          throw error;
        }

        await this.delay(retryDelay);
      }
    }

    throw new CoreError('NETWORK_ERROR', 'Unexpected retry loop state', false);
  }

  private async executeRequest<TResponse>(method: string, payload: JsonObject): Promise<TResponse> {
    if (this.mockResponder) {
      return this.mockResponder(method, payload) as Promise<TResponse>;
    }

    let response: Response;
    try {
      const hasBinary = this.containsBinaryPayload(payload);
      const body = hasBinary ? await this.toFormData(payload) : JSON.stringify(payload);
      const requestInit: RequestInit = {
        method: 'POST',
        body,
      };
      if (!hasBinary) {
        requestInit.headers = {
          'content-type': 'application/json',
        };
      }
      response = await this.fetchImpl(`${this.baseUrl}/bot${this.token}/${method}`, {
        ...requestInit,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown network error';
      throw new CoreError('NETWORK_ERROR', message, true);
    }

    const body = (await response.json()) as {
      ok: boolean;
      result?: TResponse;
      error_code?: number;
      description?: string;
      parameters?: JsonObject;
    };

    if (!body.ok) {
      throw new TelegramApiError(
        body.error_code ?? response.status,
        body.description ?? 'Unknown error',
        body.parameters,
      );
    }

    if (!('result' in body)) {
      throw new CoreError('VALIDATION_ERROR', 'Telegram API response has no result field.', false);
    }

    return body.result as TResponse;
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof CoreError) {
      return error.retryable;
    }
    return false;
  }

  private resolveRetryDelay(error: unknown, attempt: number): number | null {
    if (error instanceof TelegramApiError && error.errorCode === 429) {
      const retryAfter = error.parameters?.retry_after;
      if (typeof retryAfter === 'number') {
        return retryAfter * 1000;
      }
    }

    if (this.isRetryable(error)) {
      const exponential = this.retry.baseDelayMs * 2 ** (attempt - 1);
      const bounded = Math.min(exponential, this.retry.maxDelayMs);
      const jitterFactor = 1 + (Math.random() * 2 - 1) * this.retry.jitterRatio;
      return Math.max(0, Math.floor(bounded * jitterFactor));
    }

    return null;
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  public async sendDocument(
    chatId: number | string,
    document: BinaryInput,
    extra: JsonObject = {},
  ): Promise<TelegramApiMethodResults['sendDocument']> {
    return this.callApi('sendDocument', {
      chat_id: chatId,
      document,
      ...extra,
    } as unknown as TelegramApiMethodPayloads['sendDocument']);
  }

  public async sendMessage(
    chatId: number | string,
    text: string,
    extra: JsonObject = {},
  ): Promise<TelegramApiMethodResults['sendMessage']> {
    return this.callApi('sendMessage', {
      chat_id: chatId,
      text,
      ...extra,
    } as TelegramApiMethodPayloads['sendMessage']);
  }

  public async answerCallbackQuery(
    callbackQueryId: string,
    extra: JsonObject = {},
  ): Promise<TelegramApiMethodResults['answerCallbackQuery']> {
    return this.callApi('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      ...extra,
    } as TelegramApiMethodPayloads['answerCallbackQuery']);
  }

  public async getFileLink(fileId: string): Promise<string> {
    const result = await this.callApi<'getFile'>('getFile', {
      file_id: fileId,
    } as TelegramApiMethodPayloads['getFile']);
    const path = (result as { file_path?: string }).file_path;
    if (!path) {
      throw new CoreError('VALIDATION_ERROR', 'Telegram file response has no file_path.', false);
    }
    return `${this.baseUrl}/file/bot${this.token}/${path}`;
  }

  public async editMessageText(
    payload: TelegramApiMethodPayloads['editMessageText'],
  ): Promise<TelegramApiMethodResults['editMessageText']> {
    return this.callApi('editMessageText', payload);
  }

  public async editMessageCaption(
    payload: TelegramApiMethodPayloads['editMessageCaption'],
  ): Promise<TelegramApiMethodResults['editMessageCaption']> {
    return this.callApi('editMessageCaption', payload);
  }

  public async editMessageReplyMarkup(
    payload: TelegramApiMethodPayloads['editMessageReplyMarkup'],
  ): Promise<TelegramApiMethodResults['editMessageReplyMarkup']> {
    return this.callApi('editMessageReplyMarkup', payload);
  }

  public async editMessageMedia(
    payload: TelegramApiMethodPayloads['editMessageMedia'],
  ): Promise<TelegramApiMethodResults['editMessageMedia']> {
    return this.callApi('editMessageMedia', payload);
  }

  private containsBinaryPayload(value: unknown): boolean {
    if (isBinaryInput(value)) {
      return true;
    }
    if (Array.isArray(value)) {
      return value.some((item) => this.containsBinaryPayload(item));
    }
    if (value && typeof value === 'object') {
      const values: unknown[] = Object.values(value as Record<string, unknown>);
      return values.some((item) => this.containsBinaryPayload(item));
    }
    return false;
  }

  private async toFormData(payload: JsonObject): Promise<FormData> {
    const form = new FormData();
    for (const [key, value] of Object.entries(payload)) {
      await this.appendFormValue(form, key, value);
    }
    return form;
  }

  private async appendFormValue(form: FormData, key: string, value: unknown): Promise<void> {
    if (value === undefined || value === null) {
      return;
    }
    if (isBinaryInput(value)) {
      const file = await toBlob(value);
      form.append(key, file);
      return;
    }
    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
      form.append(key, JSON.stringify(value));
      return;
    }
    form.append(key, String(value));
  }
}

export type BinaryInput =
  | Blob
  | Uint8Array
  | ArrayBuffer
  | AsyncIterable<Uint8Array | ArrayBuffer | string>;

function isBinaryInput(value: unknown): value is BinaryInput {
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return true;
  }
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
    return true;
  }
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    Symbol.asyncIterator in (value as Record<string, unknown>)
  );
}

async function toBlob(value: BinaryInput): Promise<Blob> {
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return value;
  }
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
    return new Blob([toBlobPart(value)]);
  }

  const stream = value as AsyncIterable<Uint8Array | ArrayBuffer | string>;
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    if (typeof chunk === 'string') {
      chunks.push(new TextEncoder().encode(chunk));
    } else if (chunk instanceof Uint8Array) {
      chunks.push(chunk);
    } else {
      chunks.push(new Uint8Array(chunk));
    }
  }
  return new Blob(chunks.map((chunk) => toBlobPart(chunk)));
}

function toBlobPart(value: Uint8Array | ArrayBuffer): BlobPart {
  if (value instanceof ArrayBuffer) {
    return value.slice(0);
  }

  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  return copy.buffer as ArrayBuffer;
}
