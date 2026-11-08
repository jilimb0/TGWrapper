import type { ApiClient } from '../core/api-client.js';
import type { Context } from '../core/context.js';
import type { JsonObject } from '../types/core.js';
import type { StarAmount } from '../types/telegram.js';
import type {
  CreateStarsInvoiceLinkOptions,
  PaymentHandlerOptions,
  SendSignedGiftOptions,
  StarSubscriptionOptions,
  TelegramPreCheckoutQuery,
  TelegramSuccessfulPayment,
} from './types.js';

/**
 * Builds the payload for Telegram Bot API `createInvoiceLink` specifically for Telegram Stars (`XTR`).
 */
export function buildStarsInvoicePayload(
  options: CreateStarsInvoiceLinkOptions,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    title: options.title,
    description: options.description,
    payload: options.payload,
    provider_token: '', // Must be empty string for Telegram Stars
    currency: 'XTR',
    prices: [{ label: options.title, amount: options.starsPrice }],
  };

  if (options.photoUrl) payload.photo_url = options.photoUrl;
  if (options.photoSize !== undefined) payload.photo_size = options.photoSize;
  if (options.photoWidth !== undefined) payload.photo_width = options.photoWidth;
  if (options.photoHeight !== undefined) payload.photo_height = options.photoHeight;
  if (options.needName !== undefined) payload.need_name = options.needName;
  if (options.needPhoneNumber !== undefined) payload.need_phone_number = options.needPhoneNumber;
  if (options.needEmail !== undefined) payload.need_email = options.needEmail;
  if (options.needShippingAddress !== undefined) {
    payload.need_shipping_address = options.needShippingAddress;
  }
  if (options.sendPhoneNumberToProvider !== undefined) {
    payload.send_phone_number_to_provider = options.sendPhoneNumberToProvider;
  }
  if (options.sendEmailToProvider !== undefined) {
    payload.send_email_to_provider = options.sendEmailToProvider;
  }
  if (options.isFlexible !== undefined) payload.is_flexible = options.isFlexible;

  return payload;
}

/**
 * Creates an invoice link for payment with Telegram Stars (`XTR`).
 * Returns direct URL string (`https://t.me/$...`).
 */
export async function createStarsInvoiceLink(
  client: ApiClient,
  options: CreateStarsInvoiceLinkOptions,
): Promise<string> {
  const payload = buildStarsInvoicePayload(options);
  return client.callApiUnsafe<string>('createInvoiceLink', payload as JsonObject);
}

/**
 * Answers a Telegram pre_checkout_query.
 */
export async function answerPreCheckoutQuery(
  client: ApiClient,
  preCheckoutQueryId: string,
  ok = true,
  errorMessage?: string,
): Promise<boolean> {
  const payload: JsonObject = {
    pre_checkout_query_id: preCheckoutQueryId,
    ok,
  };
  if (!ok && errorMessage !== undefined) {
    payload.error_message = errorMessage;
  }
  return client.callApiUnsafe<boolean>('answerPreCheckoutQuery', payload);
}

/**
 * Retrieves the current Telegram Star balance of the bot.
 */
export async function getBotStarBalance(client: ApiClient): Promise<StarAmount> {
  return client.callApiUnsafe<StarAmount>('getMyStarBalance', {});
}

/**
 * Creates an invite link for a channel or supergroup chat subscription paid with Telegram Stars.
 */
export async function createStarSubscriptionLink(
  client: ApiClient,
  options: StarSubscriptionOptions,
): Promise<string> {
  const payload: JsonObject = {
    chat_id: options.chatId,
    subscription_period: options.subscriptionPeriodSeconds ?? 2_592_000, // 30 days default
    subscription_price: options.subscriptionPriceStars,
  };
  if (options.name) {
    payload.name = options.name;
  }
  const result = await client.callApiUnsafe<{ invite_link: string }>(
    'createChatSubscriptionInviteLink',
    payload,
  );
  return result.invite_link;
}

/**
 * Sends a gift with personal text signature and styling options.
 */
export async function sendSignedGift(
  client: ApiClient,
  options: SendSignedGiftOptions,
): Promise<boolean> {
  const payload: JsonObject = {
    gift_id: options.giftId,
  };
  if (options.userId !== undefined) payload.user_id = options.userId;
  if (options.chatId !== undefined) payload.chat_id = options.chatId;
  if (options.text) payload.text = options.text;
  if (options.textParseMode) payload.text_parse_mode = options.textParseMode;
  if (options.payForUpgrade) payload.pay_for_upgrade = options.payForUpgrade;

  return client.callApiUnsafe<boolean>('sendGift', payload);
}

/**
 * Converts a regular gift received by a business account to Telegram Stars.
 */
export async function convertBusinessGiftToStars(
  client: ApiClient,
  businessConnectionId: string,
  ownedGiftId: string,
): Promise<boolean> {
  return client.callApiUnsafe<boolean>('convertGiftToStars', {
    business_connection_id: businessConnectionId,
    owned_gift_id: ownedGiftId,
  });
}

/**
 * Creates TGWrapper middleware to handle Telegram payment flows:
 * - Automatically answers `pre_checkout_query`
 * - Intercepts `successful_payment` and triggers user callbacks
 * - Intercepts `subscription` updates
 */
export function createPaymentMiddleware<
  TState extends string = string,
  TData extends JsonObject = JsonObject,
>(
  options: PaymentHandlerOptions = {},
): (ctx: Context<TState, TData>, next: () => Promise<void>) => Promise<void> {
  const {
    autoApprovePreCheckout = true,
    onPreCheckout,
    onSuccessfulPayment,
    onSubscriptionUpdate,
  } = options;

  return async (ctx, next) => {
    // 1. Check for pre_checkout_query
    const preCheckoutQuery = ctx.update.pre_checkout_query as TelegramPreCheckoutQuery | undefined;
    if (preCheckoutQuery) {
      if (onPreCheckout) {
        const result = await onPreCheckout(preCheckoutQuery);
        let ok = true;
        let errorMessage: string | undefined;

        if (typeof result === 'boolean') {
          ok = result;
        } else if (result && typeof result === 'object') {
          ok = result.ok;
          errorMessage = result.errorMessage;
        }

        await ctx.answerPreCheckoutQuery(ok, errorMessage);
      } else if (autoApprovePreCheckout) {
        await ctx.answerPreCheckoutQuery(true);
      }
      return;
    }

    // 2. Check for successful_payment in message
    const successfulPayment = ctx.successfulPayment as TelegramSuccessfulPayment | undefined;
    if (successfulPayment && onSuccessfulPayment) {
      await onSuccessfulPayment(successfulPayment, ctx.fromId);
    }

    // 3. Check for subscription update
    if (ctx.update.subscription && onSubscriptionUpdate) {
      await onSubscriptionUpdate(ctx.update.subscription);
    }

    await next();
  };
}
