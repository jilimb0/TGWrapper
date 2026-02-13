import { CoreError } from '../core/errors.js';
import type { WebhookHandlerOptions, WebhookRequest, WebhookResponse } from '../types/core.js';
import type { Update } from '../types/telegram.js';
import { isValidTelegramUpdate } from '../update-loop/update-validator.js';

export interface UpdateHandler {
  handleUpdate(update: Update): Promise<void>;
}

export class WebhookHandler {
  private readonly options: Required<WebhookHandlerOptions>;
  private readonly updateHandler: UpdateHandler;

  public constructor(updateHandler: UpdateHandler, options: WebhookHandlerOptions) {
    this.updateHandler = updateHandler;
    this.options = {
      secretToken: options.secretToken,
      secretHeader: options.secretHeader ?? 'x-telegram-bot-api-secret-token'
    };
  }

  public async handle(request: WebhookRequest): Promise<WebhookResponse> {
    if (request.method.toUpperCase() !== 'POST') {
      return this.response(405, { error: 'method_not_allowed' });
    }

    const headerValue = this.readHeader(request.headers, this.options.secretHeader);
    if (!headerValue || headerValue !== this.options.secretToken) {
      return this.response(401, { error: 'invalid_signature' });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(request.rawBody);
    } catch {
      return this.response(400, { error: 'invalid_json' });
    }

    if (!isValidTelegramUpdate(parsed)) {
      return this.response(400, { error: 'invalid_update' });
    }

    try {
      await this.updateHandler.handleUpdate(parsed);
      return this.response(200, { ok: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown';
      const code = error instanceof CoreError ? error.code : 'INTERNAL';
      return this.response(500, { error: 'handler_failed', code, message });
    }
  }

  private response(status: number, body: Record<string, unknown>): WebhookResponse {
    return {
      status,
      headers: {
        'content-type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(body)
    };
  }

  private readHeader(headers: Record<string, string | undefined>, name: string): string | undefined {
    return headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
  }
}
