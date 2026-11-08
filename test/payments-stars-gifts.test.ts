import { describe, expect, it, vi } from 'vitest';
import {
  convertBusinessGiftToStars,
  createPaymentMiddleware,
  createStarSubscriptionLink,
  getBotStarBalance,
  sendSignedGift,
} from '../src/payments/stars.js';
import type { ApiClient } from '../src/core/api-client.js';
import type { Context } from '../src/core/context.js';
import { createSubscriptionUpdate } from '../src/testkit/update-factory.js';

describe('Payments: Stars & Gifts', () => {
  it('retrieves bot star balance via getBotStarBalance', async () => {
    const mockClient = {
      callApiUnsafe: vi.fn(async (method: string) => {
        if (method === 'getMyStarBalance') {
          return { amount: 5000, nanostar_amount: 500 };
        }
        return true;
      }),
    } as unknown as ApiClient;

    const balance = await getBotStarBalance(mockClient);
    expect(balance).toEqual({ amount: 5000, nanostar_amount: 500 });
  });

  it('creates star subscription link', async () => {
    const mockClient = {
      callApiUnsafe: vi.fn(async (method: string, payload: unknown) => {
        expect(method).toBe('createChatSubscriptionInviteLink');
        expect(payload).toMatchObject({
          chat_id: -10012345,
          subscription_price: 150,
          subscription_period: 2592000,
        });
        return { invite_link: 'https://t.me/+subInvite123' };
      }),
    } as unknown as ApiClient;

    const link = await createStarSubscriptionLink(mockClient, {
      chatId: -10012345,
      subscriptionPriceStars: 150,
    });
    expect(link).toBe('https://t.me/+subInvite123');
  });

  it('sends signed gift and converts business gift to stars', async () => {
    const mockClient = {
      callApiUnsafe: vi.fn(async () => true),
    } as unknown as ApiClient;

    const sent = await sendSignedGift(mockClient, {
      chatId: 12345,
      giftId: 'gift_star_balloon',
      text: 'Happy Birthday! 🎉',
      payForUpgrade: true,
    });
    expect(sent).toBe(true);

    const converted = await convertBusinessGiftToStars(mockClient, 'conn_1', 'gift_99');
    expect(converted).toBe(true);
  });

  it('intercepts subscription updates in createPaymentMiddleware', async () => {
    let capturedSubState: string | undefined;

    const middleware = createPaymentMiddleware({
      onSubscriptionUpdate: async (sub) => {
        capturedSubState = sub.state;
      },
    });

    const ctx = {
      update: createSubscriptionUpdate({ state: 'active' }),
    } as unknown as Context<string, Record<string, unknown>>;

    let nextCalled = false;
    await middleware(ctx, async () => {
      nextCalled = true;
    });

    expect(capturedSubState).toBe('active');
    expect(nextCalled).toBe(true);
  });
});
