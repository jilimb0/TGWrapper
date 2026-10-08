import { describe, expect, it, vi } from 'vitest';
import {
  answerPreCheckoutQuery,
  buildStarsInvoicePayload,
  createPaymentMiddleware,
  createStarsInvoiceLink,
} from '../src/index.js';

describe('Telegram Stars Payments module', () => {
  it('builds valid Stars invoice payload with currency XTR', () => {
    const payload = buildStarsInvoicePayload({
      title: '100 Stars Boost',
      description: 'Get extra storage minutes',
      starsPrice: 100,
      payload: 'order_12345',
      photoUrl: 'https://example.com/star.png',
    });

    expect(payload.currency).toBe('XTR');
    expect(payload.provider_token).toBe('');
    expect(payload.title).toBe('100 Stars Boost');
    expect(payload.payload).toBe('order_12345');
    expect(payload.prices).toEqual([{ label: '100 Stars Boost', amount: 100 }]);
    expect(payload.photo_url).toBe('https://example.com/star.png');
  });

  it('calls ApiClient createInvoiceLink with Stars parameters', async () => {
    const mockClient: any = {
      callApiUnsafe: vi.fn().mockResolvedValue('https://t.me/$stars_invoice_link'),
    };

    const link = await createStarsInvoiceLink(mockClient, {
      title: 'Subscription',
      description: 'Pro tier',
      starsPrice: 500,
      payload: 'sub_pro_1',
    });

    expect(link).toBe('https://t.me/$stars_invoice_link');
    expect(mockClient.callApiUnsafe).toHaveBeenCalledWith('createInvoiceLink', expect.objectContaining({
      currency: 'XTR',
      provider_token: '',
      prices: [{ label: 'Subscription', amount: 500 }],
    }));
  });

  it('answers pre_checkout_query via client helper', async () => {
    const mockClient: any = {
      callApiUnsafe: vi.fn().mockResolvedValue(true),
    };

    const result = await answerPreCheckoutQuery(mockClient, 'query_777', true);
    expect(result).toBe(true);
    expect(mockClient.callApiUnsafe).toHaveBeenCalledWith('answerPreCheckoutQuery', {
      pre_checkout_query_id: 'query_777',
      ok: true,
    });
  });

  it('payment middleware auto-approves pre_checkout_query', async () => {
    const middleware = createPaymentMiddleware();
    const answerPreCheckoutQueryMock = vi.fn().mockResolvedValue(true);

    const ctx: any = {
      update: {
        pre_checkout_query: {
          id: 'pre_checkout_123',
          from: { id: 42, first_name: 'John' },
          currency: 'XTR',
          total_amount: 100,
          invoice_payload: 'test_payload',
        },
      },
      answerPreCheckoutQuery: answerPreCheckoutQueryMock,
    };

    let nextCalled = false;
    await middleware(ctx, async () => {
      nextCalled = true;
    });

    expect(answerPreCheckoutQueryMock).toHaveBeenCalledWith(true);
    // pre_checkout should consume the update, not pass through
    expect(nextCalled).toBe(false);
  });

  it('payment middleware calls onSuccessfulPayment on payment update', async () => {
    const onSuccessfulPayment = vi.fn().mockResolvedValue(undefined);
    const middleware = createPaymentMiddleware({ onSuccessfulPayment });

    const paymentData = {
      currency: 'XTR',
      total_amount: 100,
      invoice_payload: 'test_payload',
      telegram_payment_charge_id: 'ch_1',
      provider_payment_charge_id: 'pr_1',
    };

    const ctx: any = {
      update: {},
      successfulPayment: paymentData,
      fromId: 999,
    };

    let nextCalled = false;
    await middleware(ctx, async () => {
      nextCalled = true;
    });

    expect(onSuccessfulPayment).toHaveBeenCalledWith(paymentData, 999);
    expect(nextCalled).toBe(true);
  });
});
