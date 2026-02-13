import type { JsonObject } from '../types/core.js';

export type CoreErrorCode =
  | 'CIRCUIT_OPEN'
  | 'TELEGRAM_API_ERROR'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'SESSION_CONFLICT';

export class CoreError extends Error {
  public readonly code: CoreErrorCode;
  public readonly retryable: boolean;
  public readonly details: JsonObject | undefined;

  public constructor(code: CoreErrorCode, message: string, retryable: boolean, details?: JsonObject) {
    super(message);
    this.code = code;
    this.retryable = retryable;
    this.details = details;
    this.name = 'CoreError';
  }
}

export class TelegramApiError extends CoreError {
  public readonly errorCode: number;
  public readonly description: string;
  public readonly parameters: JsonObject | undefined;

  public constructor(errorCode: number, description: string, parameters?: JsonObject) {
    super('TELEGRAM_API_ERROR', `Telegram API error ${errorCode}: ${description}`, errorCode === 429, {
      error_code: errorCode,
      description,
      parameters
    });
    this.name = 'TelegramApiError';
    this.errorCode = errorCode;
    this.description = description;
    this.parameters = parameters;
  }
}

export class CircuitOpenError extends CoreError {
  public constructor(cooldownMs: number) {
    super('CIRCUIT_OPEN', `Circuit breaker is open. Retry after ${cooldownMs}ms.`, true, {
      cooldown_ms: cooldownMs
    });
    this.name = 'CircuitOpenError';
  }
}

export class SessionConflictError extends CoreError {
  public constructor(sessionKey: string) {
    super('SESSION_CONFLICT', `Session conflict for key ${sessionKey}`, true, {
      session_key: sessionKey
    });
    this.name = 'SessionConflictError';
  }
}
