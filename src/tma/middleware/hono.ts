import type { ParsedInitData, TelegramUser, ValidateInitDataOptions } from '../types.js';
import { parseAndValidateInitData } from '../validate-init-data.js';

export interface HonoLikeContext {
  req: {
    header(name: string): string | undefined;
  };
  set(key: string, value: unknown): void;
  json(data: unknown, status?: number): Response;
}

export type HonoLikeNext = () => Promise<void>;

export interface TmaHonoMiddlewareOptions extends ValidateInitDataOptions {
  optional?: boolean;
  headerName?: string;
}

/**
 * Hono / Cloudflare Workers middleware for validating Telegram Mini App initData.
 * Injects `telegramUser` and `telegramInitData` into the context variables via `c.set()`.
 */
export function tmaHonoMiddleware(
  botToken: string,
  options?: TmaHonoMiddlewareOptions,
): (c: HonoLikeContext, next: HonoLikeNext) => Promise<Response | void> {
  return async (c, next) => {
    let rawInitData: string | undefined;
    if (options?.headerName) {
      rawInitData = c.req.header(options.headerName);
    }
    if (!rawInitData) {
      rawInitData = c.req.header('x-telegram-init-data');
    }
    if (!rawInitData) {
      const auth = c.req.header('authorization');
      if (auth && (auth.startsWith('tma ') || auth.startsWith('Tma '))) {
        rawInitData = auth.slice(4).trim();
      }
    }

    if (!rawInitData) {
      if (options?.optional) {
        return next();
      }
      return c.json({ error: 'Missing Telegram Mini App initData' }, 401);
    }

    const result = parseAndValidateInitData(rawInitData, botToken, options);
    if (!result.valid || !result.data) {
      if (options?.optional) {
        return next();
      }
      return c.json({ error: 'Invalid Telegram Mini App initData', code: result.error }, 401);
    }

    c.set('telegramInitData', result.data);
    c.set('telegramUser', result.data.user);
    return next();
  };
}
