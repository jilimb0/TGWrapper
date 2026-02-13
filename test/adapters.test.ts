import { describe, expect, it } from 'vitest';
import { AwsLambdaHandler } from '../src/adapters/aws-lambda-handler.js';
import { CloudflareWorkerHandler } from '../src/adapters/cloudflare-worker-handler.js';
import { WebhookHandler } from '../src/adapters/webhook-handler.js';
import type { ApiGatewayV2Event } from '../src/adapters/aws-lambda-handler.js';

const updatePayload = {
  update_id: 1,
  message: {
    message_id: 1,
    date: Math.floor(Date.now() / 1000),
    chat: { id: 1, type: 'private' },
    from: { id: 1, is_bot: false, first_name: 'u' },
    text: 'hello'
  }
};

describe('Serverless adapters', () => {
  it('AWS lambda handler validates secret and forwards update', async () => {
    let handled = false;
    const handler = new WebhookHandler(
      {
        handleUpdate: async () => {
          handled = true;
        }
      },
      { secretToken: 'sec' }
    );

    const lambda = new AwsLambdaHandler(handler);
    const event: ApiGatewayV2Event = {
      version: '2.0',
      routeKey: 'POST /webhook',
      rawPath: '/webhook',
      rawQueryString: '',
      headers: {
        'x-telegram-bot-api-secret-token': 'sec'
      },
      requestContext: {
        http: {
          method: 'POST',
          path: '/webhook'
        }
      },
      body: JSON.stringify(updatePayload),
      isBase64Encoded: false
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
        }
      },
      { secretToken: 'sec' }
    );
    const worker = new CloudflareWorkerHandler(handler);

    const response = await worker.handle(
      new Request('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'x-telegram-bot-api-secret-token': 'bad',
          'content-type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      })
    );

    expect(response.status).toBe(401);
  });
});
