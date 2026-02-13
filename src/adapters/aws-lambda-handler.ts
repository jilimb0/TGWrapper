import type { WebhookRequest } from '../types/core.js';
import { WebhookHandler } from './webhook-handler.js';

export interface ApiGatewayV2Event {
  version: string;
  routeKey: string;
  rawPath: string;
  rawQueryString: string;
  headers?: Record<string, string>;
  requestContext: {
    http: {
      method: string;
      path: string;
    };
  };
  body?: string;
  isBase64Encoded: boolean;
}

export interface ApiGatewayV2Response {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

export class AwsLambdaHandler {
  private readonly handler: WebhookHandler;

  public constructor(handler: WebhookHandler) {
    this.handler = handler;
  }

  public async handle(event: ApiGatewayV2Event): Promise<ApiGatewayV2Response> {
    const rawBody = event.body
      ? event.isBase64Encoded
        ? this.decodeBase64(event.body)
        : event.body
      : '';

    const request: WebhookRequest = {
      method: event.requestContext.http.method,
      headers: this.normalizeHeaders(event.headers ?? {}),
      rawBody,
      path: event.rawPath
    };

    const response = await this.handler.handle(request);
    return {
      statusCode: response.status,
      headers: response.headers,
      body: response.body
    };
  }

  private normalizeHeaders(headers: Record<string, string>): Record<string, string | undefined> {
    const normalized: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(headers)) {
      normalized[key.toLowerCase()] = value;
    }
    return normalized;
  }

  private decodeBase64(value: string): string {
    if (typeof atob === 'function') {
      return atob(value);
    }

    throw new Error('Base64 decoding is not available in this runtime.');
  }
}
