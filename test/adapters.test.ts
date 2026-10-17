import { describe, expect, it } from 'vitest';
import type { ApiGatewayV2Event } from '../src/adapters/aws-lambda-handler.js';
import { AwsLambdaHandler } from '../src/adapters/aws-lambda-handler.js';
import { CloudflareWorkerHandler } from '../src/adapters/cloudflare-worker-handler.js';
import { WebhookHandler } from '../src/adapters/webhook-handler.js';

const updatePayload = {
  update_id: 1,
  message: {
    message_id: 1,
    date: Math.floor(Date.now() / 1000),
    chat: { id: 1, type: 'private' },
    from: { id: 1, is_bot: false, first_name: 'u' },
    text: 'hello',
  },
};

describe('Serverless adapters', () => {
  it('AWS lambda handler validates secret and forwards update', async () => {
    let handled = false;
    const handler = new WebhookHandler(
      {
        handleUpdate: async () => {
          handled = true;
        },
      },
      { secretToken: 'sec' },
    );

    const lambda = new AwsLambdaHandler(handler);
    const event: ApiGatewayV2Event = {
      version: '2.0',
      routeKey: 'POST /webhook',
      rawPath: '/webhook',
      rawQueryString: '',
      headers: {
        'x-telegram-bot-api-secret-token': 'sec',
      },
      requestContext: {
        http: {
          method: 'POST',
          path: '/webhook',
        },
      },
      body: JSON.stringify(updatePayload),
      isBase64Encoded: false,
    };

    const result = await lambda.handle(event);
    expect(result.statusCode).toBe(200);
    expect(handled).toBe(true);
  });

  it('Cloudflare handler rejects wrong secret', async () => {
    const handler = new WebhookHandler(
      {
        handleUpdate: async () => {
          throw new Error('must not happen');
        },
      },
      { secretToken: 'sec' },
    );
    const worker = new CloudflareWorkerHandler(handler);

    const response = await worker.handle(
      new Request('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'x-telegram-bot-api-secret-token': 'bad',
          'content-type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      }),
    );

    expect(response.status).toBe(401);
  });

  it('WebhookHandler responds to /healthz probe and echoes correlation ID with defensive headers', async () => {
    const handler = new WebhookHandler(
      {
        handleUpdate: async () => {},
      },
      { secretToken: 'sec' },
    );

    const response = await handler.handle({
      method: 'GET',
      path: '/healthz',
      headers: {
        'x-correlation-id': 'tgw-cid-789',
      },
      rawBody: '',
    });

    expect(response.status).toBe(200);
    expect(response.headers['x-correlation-id']).toBe('tgw-cid-789');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    const parsed = JSON.parse(response.body);
    expect(parsed.ok).toBe(true);
    expect(parsed.status).toBe('ok');
    expect(parsed.service).toBe('tgwrapper');
  });
});
