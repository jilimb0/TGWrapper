export interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string | undefined;
  username?: string | undefined;
  languageCode?: string | undefined;
  isPremium?: boolean | undefined;
  allowsWriteToPm?: boolean | undefined;
  photoUrl?: string | undefined;
}

export interface TelegramChat {
  id: number;
  type: string;
  title: string;
  username?: string | undefined;
  photoUrl?: string | undefined;
}

export interface ParsedInitData {
  queryId?: string | undefined;
  user?: TelegramUser | undefined;
  receiver?: TelegramUser | undefined;
  chat?: TelegramChat | undefined;
  chatType?: string | undefined;
  chatInstance?: string | undefined;
  startParam?: string | undefined;
  canSendAfter?: number | undefined;
  authDate: number;
  hash: string;
  raw: Record<string, string>;
}

export interface ValidateInitDataOptions {
  /**
   * Maximum age of initData in seconds (to prevent replay attacks).
   * Defaults to 86400 (24 hours). Set to 0 to disable check.
   */
  maxAgeSeconds?: number | undefined;
  /**
   * Reference timestamp in milliseconds. Defaults to Date.now().
   */
  currentTimeMs?: number | undefined;
}

export type TmaErrorCode =
  | 'MISSING_HASH'
  | 'MISSING_AUTH_DATE'
  | 'HASH_MISMATCH'
  | 'EXPIRED'
  | 'MALFORMED';

export interface TmaValidationResult {
  valid: boolean;
  error?: TmaErrorCode | undefined;
  data?: ParsedInitData | undefined;
}
