import { describe, expect, it } from 'vitest';
import { AwsLambdaHandler } from '../src/adapters/aws-lambda-handler.js';
import { CloudflareWorkerHandler } from '../src/adapters/cloudflare-worker-handler.js';
import { NodeHttpHandler } from '../src/adapters/node-http-handler.js';
import { WebhookHandler } from '../src/adapters/webhook-handler.js';
import type { ApiGatewayV2Event } from '../src/adapters/aws-lambda-handler.js';
import type { NodeLikeIncomingMessage, NodeLikeServerResponse } from '../src/adapters/node-http-handler.js';

const secretHeader = 'x-telegram-bot-api-secret-token';
const secretToken = 'sec';
const validUpdate = {
  update_id: 1,
  message: {
    message_id: 1,
    date: Math.floor(Date.now() / 1000),
    chat: { id: 1, type: 'private' as const },
    from: { id: 1, is_bot: false, first_name: 'u' },
    text: 'hello'
  }
};

class FakeNodeRequest implements NodeLikeIncomingMessage {
  public method?: string;
  public headers: Record<string, string | string[] | undefined>;
  private readonly rawBody: string;
  private readonly listeners: {
    data?: (chunk: unknown) => void;
    end?: () => void;
    error?: (error: Error) => void;
  } = {};

  public constructor(method: string, headers: Record<string, string | undefined>, rawBody: string) {
    this.method = method;
    this.headers = headers;
    this.rawBody = rawBody;
  }

  public on(event: 'data' | 'end' | 'error', listener: ((chunk: unknown) => void) | (() => void) | ((error: Error) => void)): void {
    if (event === 'data') {
      this.listeners.data = listener as (chunk: unknown) => void;
    }
    if (event === 'end') {
      this.listeners.end = listener as () => void;
    }
    if (event === 'error') {
      this.listeners.error = listener as (error: Error) => void;
    }
  }

  public emitAll(): void {
    this.listeners.data?.(this.rawBody);
    this.listeners.end?.();
  }
}

class FakeNodeResponse implements NodeLikeServerResponse {
  public statusCode = 0;
  public headers: Record<string, string> = {};
  public body = '';

  public setHeader(name: string, value: string): void {
    this.headers[name.toLowerCase()] = value;
  }

  public end(body = ''): void {
    this.body = body;
  }
}

function buildWebhookHandler() {
  return new WebhookHandler(
    {
      handleUpdate: async () => {
        return;
      }
    },
    { secretToken }
  );
}

describe('Adapter contract', () => {
  it('returns 200 for valid webhook payload across all adapters', async () => {
    const core = buildWebhookHandler();
    const rawBody = JSON.stringify(validUpdate);

    const lambda = new AwsLambdaHandler(core);
    const lambdaEvent: ApiGatewayV2Event = {
      version: '2.0',
      routeKey: 'POST /webhook',
      rawPath: '/webhook',
      rawQueryString: '',
      headers: {
        [secretHeader]: secretToken
      },
      requestContext: {
        http: {
          method: 'POST',
          path: '/webhook'
        }
      },
      body: rawBody,
      isBase64Encoded: false
    };
    const lambdaResult = await lambda.handle(lambdaEvent);
    expect(lambdaResult.statusCode).toBe(200);

    const worker = new CloudflareWorkerHandler(core);
    const workerResponse = await worker.handle(
      new Request('https://example.com/webhook', {
        method: 'POST',
        headers: {
          [secretHeader]: secretToken,
          'content-type': 'application/json'
        },
        body: rawBody
      })
    );
    expect(workerResponse.status).toBe(200);

    const node = new NodeHttpHandler(core);
    const nodeReq = new FakeNodeRequest('POST', { [secretHeader]: secretToken }, rawBody);
    const nodeRes = new FakeNodeResponse();
    const pending = node.handle(nodeReq, nodeRes);
    nodeReq.emitAll();
    await pending;
    expect(nodeRes.statusCode).toBe(200);
  });

  it('returns 401 for invalid secret across all adapters', async () => {
    const core = buildWebhookHandler();
    const rawBody = JSON.stringify(validUpdate);

    const lambda = new AwsLambdaHandler(core);
    const lambdaResult = await lambda.handle({
      version: '2.0',
      routeKey: 'POST /webhook',
      rawPath: '/webhook',
      rawQueryString: '',
      headers: { [secretHeader]: 'bad' },
      requestContext: { http: { method: 'POST', path: '/webhook' } },
      body: rawBody,
      isBase64Encoded: false
    });
    expect(lambdaResult.statusCode).toBe(401);

    const worker = new CloudflareWorkerHandler(core);
    const workerResponse = await worker.handle(
      new Request('https://example.com/webhook', {
        method: 'POST',
        headers: { [secretHeader]: 'bad' },
        body: rawBody
      })
    );
    expect(workerResponse.status).toBe(401);

    const node = new NodeHttpHandler(core);
    const nodeReq = new FakeNodeRequest('POST', { [secretHeader]: 'bad' }, rawBody);
    const nodeRes = new FakeNodeResponse();
    const pending = node.handle(nodeReq, nodeRes);
    nodeReq.emitAll();
    await pending;
    expect(nodeRes.statusCode).toBe(401);
  });
});
