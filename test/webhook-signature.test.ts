import { describe, expect, it, vi } from 'vitest';
import { WebhookHandler } from '../src/adapters/webhook-handler.js';
import { WebhookSource } from '../src/update-loop/webhook.js';

describe('Webhook signature constant-time validation', () => {
  it('WebhookSource.validateSignature accepts exact match and rejects mismatches', () => {
    const source = new WebhookSource();
    const options = {
      headerName: 'X-Telegram-Bot-Api-Secret-Token',
      secretToken: 'super-secret-token-123',
    };

    expect(
      source.validateSignature(
        { 'x-telegram-bot-api-secret-token': 'super-secret-token-123' },
        options,
      ),
    ).toBe(true);

    // Same length mismatch
    expect(
      source.validateSignature(
        { 'x-telegram-bot-api-secret-token': 'super-secret-token-124' },
        options,
      ),
    ).toBe(false);

    // Different length mismatch
    expect(
      source.validateSignature({ 'x-telegram-bot-api-secret-token': 'short' }, options),
    ).toBe(false);

    // Missing header
    expect(source.validateSignature({}, options)).toBe(false);
  });

  it('WebhookHandler rejects same-length and different-length invalid secrets with 401', async () => {
    const handleUpdate = vi.fn(async () => {});
    const handler = new WebhookHandler({ handleUpdate }, { secretToken: 'token-abc' });

    const sameLen = await handler.handle({
      method: 'POST',
      headers: { 'x-telegram-bot-api-secret-token': 'token-abd' },
      rawBody: '{}',
    });
    expect(sameLen.status).toBe(401);

    const diffLen = await handler.handle({
      method: 'POST',
      headers: { 'x-telegram-bot-api-secret-token': 'x' },
      rawBody: '{}',
    });
    expect(diffLen.status).toBe(401);
    expect(handleUpdate).not.toHaveBeenCalled();
  });
});
