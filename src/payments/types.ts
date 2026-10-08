export interface LabeledPrice {
  label: string;
  amount: number;
}

export interface CreateStarsInvoiceLinkOptions {
  title: string;
  description: string;
  payload: string;
  starsPrice: number;
  photoUrl?: string | undefined;
  photoSize?: number | undefined;
  photoWidth?: number | undefined;
  photoHeight?: number | undefined;
  needName?: boolean | undefined;
  needPhoneNumber?: boolean | undefined;
  needEmail?: boolean | undefined;
  needShippingAddress?: boolean | undefined;
  sendPhoneNumberToProvider?: boolean | undefined;
  sendEmailToProvider?: boolean | undefined;
  isFlexible?: boolean | undefined;
}

export interface TelegramSuccessfulPayment {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  subscription_expiration_date?: number | undefined;
  is_recurring?: boolean | undefined;
  is_first_recurring?: boolean | undefined;
  shipping_option_id?: string | undefined;
  order_info?: unknown;
  telegram_payment_charge_id: string;
  provider_payment_charge_id: string;
}

export interface TelegramPreCheckoutQuery {
  id: string;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string | undefined;
    username?: string | undefined;
    language_code?: string | undefined;
  };
  currency: string;
  total_amount: number;
  invoice_payload: string;
  shipping_option_id?: string | undefined;
  order_info?: unknown;
}

export interface PaymentHandlerOptions {
  autoApprovePreCheckout?: boolean | undefined;
  onPreCheckout?:
    | ((query: TelegramPreCheckoutQuery) => Promise<boolean | { ok: boolean; errorMessage?: string | undefined }>)
    | undefined;
  onSuccessfulPayment?:
    | ((payment: TelegramSuccessfulPayment, fromId?: number | undefined) => Promise<void>)
    | undefined;
}
