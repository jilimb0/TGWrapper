import type { WebhookRequest } from '../types/core.js';
import { WebhookHandler } from './webhook-handler.js';

export class CloudflareWorkerHandler {
  private readonly handler: WebhookHandler;

  public constructor(handler: WebhookHandler) {
    this.handler = handler;
  }

  public async handle(request: Request): Promise<Response> {
    const headers: Record<string, string | undefined> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const mapped: WebhookRequest = {
      method: request.method,
      headers,
      rawBody: await request.text(),
      path: new URL(request.url).pathname
    };

    const response = await this.handler.handle(mapped);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers
    });
  }
}
