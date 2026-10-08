import type { ParsedInitData, TelegramUser, ValidateInitDataOptions } from '../types.js';
import { parseAndValidateInitData } from '../validate-init-data.js';

export interface ExpressLikeRequest {
  headers: Record<string, string | string[] | undefined>;
  telegramUser?: TelegramUser | undefined;
  telegramInitData?: ParsedInitData | undefined;
  [key: string]: unknown;
}

export interface ExpressLikeResponse {
  status(code: number): this;
  json(body: unknown): this;
  end(): void;
}

export type ExpressLikeNextFunction = (err?: unknown) => void;

export interface TmaExpressMiddlewareOptions extends ValidateInitDataOptions {
  /**
   * If true, does not reject requests missing or with invalid initData,
   * but leaves `req.telegramUser` undefined. Default is false.
   */
  optional?: boolean | undefined;
  /**
   * Custom header name to extract raw initData from.
   * Default checks 'x-telegram-init-data' and 'authorization: tma <initData>'.
   */
  headerName?: string | undefined;
}

export function extractInitDataFromHeaders(
  headers: Record<string, string | string[] | undefined>,
  customHeader?: string,
): string | undefined {
  if (customHeader) {
    const val = headers[customHeader.toLowerCase()];
    if (val) return Array.isArray(val) ? val[0] : val;
  }

  const directHeader = headers['x-telegram-init-data'];
  if (directHeader) {
    return Array.isArray(directHeader) ? directHeader[0] : directHeader;
  }

  const authHeader = headers.authorization;
  const authStr = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (authStr) {
    if (authStr.startsWith('tma ') || authStr.startsWith('Tma ')) {
      return authStr.slice(4).trim();
    }
  }

  return undefined;
}

export function tmaExpressMiddleware(
  botToken: string,
  options?: TmaExpressMiddlewareOptions,
): (req: ExpressLikeRequest, res: ExpressLikeResponse, next: ExpressLikeNextFunction) => void {
  return (req, res, next) => {
    const rawInitData = extractInitDataFromHeaders(req.headers, options?.headerName);

    if (!rawInitData) {
      if (options?.optional) {
        return next();
      }
      res.status(401).json({ error: 'Missing Telegram Mini App initData' });
      return;
    }

    const result = parseAndValidateInitData(rawInitData, botToken, options);
    if (!result.valid || !result.data) {
      if (options?.optional) {
        return next();
      }
      res.status(401).json({ error: 'Invalid Telegram Mini App initData', code: result.error });
      return;
    }

    req.telegramInitData = result.data;
    req.telegramUser = result.data.user;
    next();
  };
}
