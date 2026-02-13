import { CircuitBreaker } from './circuit-breaker.js';
import { CircuitOpenError, CoreError, TelegramApiError } from './errors.js';
import type { ApiClientOptions, JsonObject, RetryOptions } from '../types/core.js';

const DEFAULT_RETRY: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 300,
  maxDelayMs: 5_000,
  jitterRatio: 0.2
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

  public constructor(options: ApiClientOptions) {
    this.token = options.token;
    this.baseUrl = options.baseUrl ?? 'https://api.telegram.org';
    this.logger = options.logger;
    this.metrics = options.metrics;
    this.retry = { ...DEFAULT_RETRY, ...options.retry };
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.mockResponder = options.mockResponder;
    this.circuitBreaker = new CircuitBreaker(options.circuitBreaker);
  }

  public async callApi<TResponse>(method: string, payload: JsonObject): Promise<TResponse> {
    const requestId = crypto.randomUUID();
    const started = Date.now();

    for (let attempt = 1; attempt <= this.retry.maxRetries + 1; attempt += 1) {
      try {
        this.circuitBreaker.beforeRequest(Date.now());
        const response = await this.executeRequest<TResponse>(method, payload);
        const durationMs = Date.now() - started;
        this.circuitBreaker.onSuccess();

        this.metrics?.observe('telegram_api_latency_ms', durationMs, { method });

        this.logger?.log({
          level: 'info',
          event: 'telegram_api_call_success',
          timestamp: new Date().toISOString(),
          requestId,
          data: {
            method,
            attempt,
            duration_ms: durationMs
          }
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
            message: error instanceof Error ? error.message : 'unknown'
          }
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
      response = await this.fetchImpl(`${this.baseUrl}/bot${this.token}/${method}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
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
      throw new TelegramApiError(body.error_code ?? response.status, body.description ?? 'Unknown error', body.parameters);
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
      const exponential = this.retry.baseDelayMs * Math.pow(2, attempt - 1);
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
}
