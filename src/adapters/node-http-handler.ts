import type { WebhookRequest } from '../types/core.js';
import type { WebhookHandler } from './webhook-handler.js';

export interface NodeLikeIncomingMessage {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  on(event: 'data', listener: (chunk: unknown) => void): void;
  on(event: 'end', listener: () => void): void;
  on(event: 'error', listener: (error: Error) => void): void;
}

export interface NodeLikeServerResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
}

export class NodeHttpHandler {
  private readonly handler: WebhookHandler;

  public constructor(handler: WebhookHandler) {
    this.handler = handler;
  }

  public async handle(req: NodeLikeIncomingMessage, res: NodeLikeServerResponse): Promise<void> {
    const chunks: string[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on('data', (chunk: unknown) => {
        chunks.push(this.toChunkString(chunk));
      });
      req.on('end', () => resolve());
      req.on('error', (error: Error) => reject(error));
    });

    const headers: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      headers[key] = Array.isArray(value) ? value[0] : value;
    }

    const request: WebhookRequest = {
      method: req.method ?? 'GET',
      headers,
      rawBody: chunks.join(''),
    };

    const response = await this.handler.handle(request);
    res.statusCode = response.status;
    for (const [header, value] of Object.entries(response.headers)) {
      res.setHeader(header, value);
    }
    res.end(response.body);
  }

  private toChunkString(chunk: unknown): string {
    if (typeof chunk === 'string') {
      return chunk;
    }

    if (chunk instanceof Uint8Array) {
      return new TextDecoder().decode(chunk);
    }

    return String(chunk);
  }
}
