import { describe, expect, it } from 'vitest';
import {
  MemorySessionStorage,
  TmaSessionBridge,
  computeInitDataHash,
  extractInitDataFromHeaders,
  parseAndValidateInitData,
  parseInitData,
  tmaExpressMiddleware,
  tmaHonoMiddleware,
  validateInitData,
  validateNextJsTmaRequest,
} from '../src/index.js';

describe('TMA (Telegram Mini Apps) module', () => {
  const botToken = '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ123456789';
  const nowSeconds = 1700000000;
  const nowMs = nowSeconds * 1000;

  const rawUserJson = JSON.stringify({
    id: 987654321,
    first_name: 'Pavel',
    last_name: 'Durov',
    username: 'durov',
    language_code: 'en',
    is_premium: true,
  });

  function createSampleInitData(authDate: number = nowSeconds, userStr: string = rawUserJson) {
    const params = new URLSearchParams();
    params.set('auth_date', String(authDate));
    params.set('query_id', 'AAHdF6IQAAAAAN0XohDhrOrc');
    params.set('user', userStr);
    const queryString = params.toString();
    const hash = computeInitDataHash(queryString, botToken);
    params.set('hash', hash);
    return params.toString();
  }

  describe('validateInitData & parseAndValidateInitData', () => {
    it('validates authentic initData correctly', () => {
      const initData = createSampleInitData(nowSeconds);
      const isValid = validateInitData(initData, botToken, { currentTimeMs: nowMs });
      expect(isValid).toBe(true);

      const result = parseAndValidateInitData(initData, botToken, { currentTimeMs: nowMs });
      expect(result.valid).toBe(true);
      expect(result.data?.user?.id).toBe(987654321);
      expect(result.data?.user?.firstName).toBe('Pavel');
      expect(result.data?.user?.lastName).toBe('Durov');
      expect(result.data?.user?.username).toBe('durov');
      expect(result.data?.user?.isPremium).toBe(true);
      expect(result.data?.queryId).toBe('AAHdF6IQAAAAAN0XohDhrOrc');
    });

    it('rejects tampered initData with invalid hash', () => {
      const initData = createSampleInitData(nowSeconds);
      const tampered = `${initData}&extra=attack`;
      const result = parseAndValidateInitData(tampered, botToken, { currentTimeMs: nowMs });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('HASH_MISMATCH');
    });

    it('rejects expired initData exceeding maxAge', () => {
      const oldTime = nowSeconds - 100_000; // > 24 hours ago
      const initData = createSampleInitData(oldTime);
      const result = parseAndValidateInitData(initData, botToken, {
        currentTimeMs: nowMs,
        maxAgeSeconds: 86400,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('EXPIRED');
    });

    it('rejects missing hash or missing auth_date', () => {
      expect(parseAndValidateInitData('user=123', botToken).error).toBe('MISSING_HASH');
      expect(parseAndValidateInitData('hash=123', botToken).error).toBe('MISSING_AUTH_DATE');
    });
  });

  describe('Express Middleware', () => {
    it('extracts initData and populates req.telegramUser', () => {
      const initData = createSampleInitData(nowSeconds);
      const middleware = tmaExpressMiddleware(botToken, { currentTimeMs: nowMs });

      const req: any = {
        headers: {
          'x-telegram-init-data': initData,
        },
      };
      const res: any = {
        status: () => res,
        json: () => res,
      };
      let nextCalled = false;
      middleware(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
      expect(req.telegramUser?.id).toBe(987654321);
      expect(req.telegramUser?.username).toBe('durov');
    });

    it('supports Authorization: tma <initData> header', () => {
      const initData = createSampleInitData(nowSeconds);
      const extracted = extractInitDataFromHeaders({ authorization: `tma ${initData}` });
      expect(extracted).toBe(initData);
    });

    it('rejects with 401 when initData is missing or invalid', () => {
      const middleware = tmaExpressMiddleware(botToken);
      let statusCode = 0;
      let jsonBody: any = null;
      const req: any = { headers: {} };
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (body: any) => {
          jsonBody = body;
          return res;
        },
      };

      middleware(req, res, () => {});
      expect(statusCode).toBe(401);
      expect(jsonBody?.error).toContain('Missing Telegram Mini App initData');
    });
  });

  describe('Next.js Route Handler validator', () => {
    it('authenticates valid Request headers', () => {
      const initData = createSampleInitData(nowSeconds);
      const request = new Request('https://api.example.com/me', {
        headers: {
          'x-telegram-init-data': initData,
        },
      });

      const res = validateNextJsTmaRequest(request, botToken, { currentTimeMs: nowMs });
      expect(res.authenticated).toBe(true);
      expect(res.user?.id).toBe(987654321);
      expect(res.user?.firstName).toBe('Pavel');
    });

    it('returns error when authorization fails', () => {
      const request = new Request('https://api.example.com/me');
      const res = validateNextJsTmaRequest(request, botToken);
      expect(res.authenticated).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe('Hono Middleware', () => {
    it('sets telegramUser context variable on valid request', async () => {
      const initData = createSampleInitData(nowSeconds);
      const middleware = tmaHonoMiddleware(botToken, { currentTimeMs: nowMs });

      const vars = new Map<string, unknown>();
      const ctx: any = {
        req: {
          header: (name: string) => (name === 'x-telegram-init-data' ? initData : undefined),
        },
        set: (k: string, v: unknown) => vars.set(k, v),
        json: () => new Response(),
      };

      let nextCalled = false;
      await middleware(ctx, async () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
      expect(vars.get('telegramUser')).toEqual(
        expect.objectContaining({
          id: 987654321,
          firstName: 'Pavel',
        }),
      );
    });
  });

  describe('TmaSessionBridge', () => {
    it('manages user sessions bridged to TGWrapper storage', async () => {
      const storage = new MemorySessionStorage<{ count: number }>();
      const bridge = new TmaSessionBridge(storage, {
        scope: { tenantId: 't1', botId: 'b1' },
      });

      expect(await bridge.getSession(987654321)).toBeNull();

      await bridge.setSession(987654321, { count: 1 });
      const session = await bridge.getSession(987654321);
      expect(session).toEqual({ count: 1 });

      const updated = await bridge.updateSession(987654321, (curr) => ({
        count: (curr?.count ?? 0) + 5,
      }));
      expect(updated.count).toBe(6);

      await bridge.deleteSession(987654321);
      expect(await bridge.getSession(987654321)).toBeNull();
    });
  });
});
