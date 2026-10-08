import type { ParsedInitData, TelegramUser, ValidateInitDataOptions } from '../types.js';
import { parseAndValidateInitData } from '../validate-init-data.js';

export interface NextJsTmaOptions extends ValidateInitDataOptions {
  headerName?: string | undefined;
}

export interface NextJsTmaAuthResult {
  authenticated: boolean;
  user?: TelegramUser | undefined;
  initData?: ParsedInitData | undefined;
  error?: string | undefined;
}

/**
 * Validates Telegram Mini App request in Next.js App Router route handlers.
 *
 * Example:
 * ```ts
 * export async function GET(req: Request) {
 *   const { authenticated, user, error } = validateNextJsTmaRequest(req, process.env.BOT_TOKEN!);
 *   if (!authenticated) {
 *     return Response.json({ error }, { status: 401 });
 *   }
 *   return Response.json({ ok: true, user });
 * }
 * ```
 */
export function validateNextJsTmaRequest(
  request: Request,
  botToken: string,
  options?: NextJsTmaOptions,
): NextJsTmaAuthResult {
  let rawInitData: string | null = null;

  if (options?.headerName) {
    rawInitData = request.headers.get(options.headerName);
  }

  if (!rawInitData) {
    rawInitData = request.headers.get('x-telegram-init-data');
  }

  if (!rawInitData) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && (authHeader.startsWith('tma ') || authHeader.startsWith('Tma '))) {
      rawInitData = authHeader.slice(4).trim();
    }
  }

  if (!rawInitData) {
    return {
      authenticated: false,
      error: 'Missing Telegram Mini App initData in request headers',
    };
  }

  const result = parseAndValidateInitData(rawInitData, botToken, options);
  if (!result.valid || !result.data) {
    return {
      authenticated: false,
      error: `Invalid Telegram Mini App initData: ${result.error ?? 'UNKNOWN'}`,
    };
  }

  const authResult: NextJsTmaAuthResult = {
    authenticated: true,
    initData: result.data,
  };
  if (result.data.user !== undefined) {
    authResult.user = result.data.user;
  }
  return authResult;
}
