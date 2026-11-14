import { describe, expect, it, vi } from 'vitest';
import {
  ApprovalGateBotBridge,
  type ApprovalGateData,
  computeInitDataHash,
  MemorySessionStorage,
  type SessionEnvelope,
  SessionManager,
} from '../src/index.js';

describe('ApprovalGateBotBridge', () => {
  const botToken = '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ123456789';

  function createBridge(initialOverrides?: Partial<ApprovalGateData>) {
    const storage = new MemorySessionStorage<SessionEnvelope<string, ApprovalGateData>>();
    const sessionManager = new SessionManager<string, ApprovalGateData>({
      storage,
      initialData: () => ({
        gateId: 'gate-1',
        status: 'PENDING',
        riskLevel: 'HIGH',
        actionSummary: 'Close leveraged positions',
        ...initialOverrides,
      }),
    });
    const bridge = new ApprovalGateBotBridge(sessionManager);
    return { storage, sessionManager, bridge };
  }

  function createSignedInitData(
    authDateSeconds: number,
    user: { id: number; first_name: string; username?: string } = {
      id: 987654321,
      first_name: 'Pavel',
      username: 'durov',
    },
  ): string {
    const params = new URLSearchParams();
    params.set('auth_date', String(authDateSeconds));
    params.set('query_id', 'AAHdF6IQAAAAAN0XohDhrOrc');
    params.set('user', JSON.stringify(user));
    const hash = computeInitDataHash(params.toString(), botToken);
    params.set('hash', hash);
    return params.toString();
  }

  describe('decideGateCas', () => {
    it('supports backward-compatible positional arguments including STEERED instruction', async () => {
      const { bridge, sessionManager } = createBridge();

      const result = await bridge.decideGateCas(
        'gate:1',
        1,
        'STEERED',
        'operator-1',
        'Reduce size by 50%',
      );

      expect(result).toEqual({
        applied: true,
        newVersion: 2,
      });

      const loaded = await sessionManager.load('gate:1');
      expect(loaded.version).toBe(2);
      expect(loaded.value.data.status).toBe('STEERED');
      expect(loaded.value.data.decidedByUserId).toBe('operator-1');
      expect(loaded.value.data.steerInstruction).toBe('Reduce size by 50%');
    });

    it('persists idempotencyKey, scope SINGLE_SYMBOL, symbol, and maxSlippageBps', async () => {
      const { bridge, sessionManager } = createBridge();

      const result = await bridge.decideGateCas('gate:1', 1, 'APPROVED', 'operator-1', {
        idempotencyKey: 'idem-single-1',
        scope: 'SINGLE_SYMBOL',
        symbol: 'BTC-PERP',
        maxSlippageBps: 50,
      });

      expect(result).toEqual({
        applied: true,
        newVersion: 2,
      });

      const loaded = await sessionManager.load('gate:1');
      expect(loaded.version).toBe(2);
      expect(loaded.value.data.status).toBe('APPROVED');
      expect(loaded.value.data.idempotencyKey).toBe('idem-single-1');
      expect(loaded.value.data.scope).toBe('SINGLE_SYMBOL');
      expect(loaded.value.data.symbol).toBe('BTC-PERP');
      expect(loaded.value.data.maxSlippageBps).toBe(50);
      expect(loaded.value.data.lastIdempotencyKeys).toContain('idem-single-1');
    });

    it('supports scope ALL_POSITIONS with maxSlippageBps', async () => {
      const { bridge, sessionManager } = createBridge();

      const result = await bridge.decideGateCas(
        'gate:all',
        1,
        'APPROVED',
        'operator-2',
        undefined,
        {
          idempotencyKey: 'idem-all-1',
          scope: 'ALL_POSITIONS',
          maxSlippageBps: 120,
        },
      );

      expect(result).toEqual({
        applied: true,
        newVersion: 2,
      });

      const loaded = await sessionManager.load('gate:all');
      expect(loaded.value.data.scope).toBe('ALL_POSITIONS');
      expect(loaded.value.data.maxSlippageBps).toBe(120);
      expect(loaded.value.data.symbol).toBeUndefined();
    });

    it('returns cached idempotent result on repeated idempotencyKey without double mutation', async () => {
      const { bridge, sessionManager, storage } = createBridge();
      const casSpy = vi.spyOn(storage, 'compareAndSet');

      const first = await bridge.decideGateCas('gate:idem', 1, 'APPROVED', 'operator-1', {
        idempotencyKey: 'idem-repeat-1',
        scope: 'SINGLE_SYMBOL',
        symbol: 'ETH-PERP',
        maxSlippageBps: 25,
      });
      expect(first).toEqual({ applied: true, newVersion: 2 });

      const writesAfterFirst = casSpy.mock.calls.length;

      const second = await bridge.decideGateCas('gate:idem', 1, 'REJECTED', 'operator-2', {
        idempotencyKey: 'idem-repeat-1',
        scope: 'ALL_POSITIONS',
        maxSlippageBps: 999,
      });

      expect(second).toEqual({
        applied: true,
        newVersion: 2,
        idempotentHit: true,
      });
      expect(casSpy.mock.calls.length).toBe(writesAfterFirst);

      const loaded = await sessionManager.load('gate:idem');
      expect(loaded.version).toBe(2);
      expect(loaded.value.data.status).toBe('APPROVED');
      expect(loaded.value.data.decidedByUserId).toBe('operator-1');
      expect(loaded.value.data.scope).toBe('SINGLE_SYMBOL');
      expect(loaded.value.data.symbol).toBe('ETH-PERP');
      expect(loaded.value.data.maxSlippageBps).toBe(25);
    });

    it('enforces atomic CAS expectedVersion check and rejects stale version without mutation', async () => {
      const { bridge, sessionManager } = createBridge();

      const first = await bridge.decideGateCas('gate:cas', 1, 'APPROVED', 'operator-1', {
        idempotencyKey: 'idem-cas-1',
        scope: 'ALL_POSITIONS',
        maxSlippageBps: 75,
      });
      expect(first).toEqual({ applied: true, newVersion: 2 });

      const stale = await bridge.decideGateCas('gate:cas', 1, 'REJECTED', 'operator-2', {
        idempotencyKey: 'idem-cas-2',
        scope: 'ALL_POSITIONS',
        maxSlippageBps: 75,
      });
      expect(stale).toEqual({
        applied: false,
        newVersion: 2,
        conflictReason: 'VERSION_MISMATCH',
      });

      const loaded = await sessionManager.load('gate:cas');
      expect(loaded.version).toBe(2);
      expect(loaded.value.data.status).toBe('APPROVED');
      expect(loaded.value.data.decidedByUserId).toBe('operator-1');
    });

    it('handles concurrent decideGateCas calls with same idempotencyKey without double mutation', async () => {
      const { bridge, sessionManager } = createBridge();

      const [r1, r2] = await Promise.all([
        bridge.decideGateCas('gate:concurrent-idem', 1, 'APPROVED', 'operator-1', {
          idempotencyKey: 'idem-race',
          scope: 'ALL_POSITIONS',
          maxSlippageBps: 30,
        }),
        bridge.decideGateCas('gate:concurrent-idem', 1, 'APPROVED', 'operator-1', {
          idempotencyKey: 'idem-race',
          scope: 'ALL_POSITIONS',
          maxSlippageBps: 30,
        }),
      ]);

      const appliedCount = [r1, r2].filter((r) => r.applied).length;
      const idempotentCount = [r1, r2].filter((r) => r.idempotentHit === true).length;
      expect(appliedCount).toBe(2);
      expect(idempotentCount).toBe(1);
      expect(r1.newVersion).toBe(2);
      expect(r2.newVersion).toBe(2);

      const loaded = await sessionManager.load('gate:concurrent-idem');
      expect(loaded.version).toBe(2);
    });
  });

  describe('verifyAndDecideTmaGate', () => {
    it('rejects invalid initData BEFORE touching session', async () => {
      const { bridge, sessionManager, storage } = createBridge();
      const runSpy = vi.spyOn(sessionManager, 'runInSession');
      const getSpy = vi.spyOn(storage, 'getWithVersion');
      const casSpy = vi.spyOn(storage, 'compareAndSet');

      const nowSeconds = 1700000000;
      const validInitData = createSignedInitData(nowSeconds);
      const tamperedInitData = `${validInitData}&tamper=1`;

      const result = await bridge.verifyAndDecideTmaGate(tamperedInitData, botToken, {
        sessionKey: 'gate:tma-invalid',
        expectedVersion: 1,
        decision: 'APPROVED',
        idempotencyKey: 'tma-idem-bad',
        scope: 'ALL_POSITIONS',
        maxSlippageBps: 50,
        currentTimeMs: nowSeconds * 1000,
      });

      expect(result.authenticated).toBe(false);
      expect(result.applied).toBe(false);
      expect(result.tmaError).toBe('HASH_MISMATCH');
      expect(runSpy).not.toHaveBeenCalled();
      expect(getSpy).not.toHaveBeenCalled();
      expect(casSpy).not.toHaveBeenCalled();
    });

    it('rejects expired initData BEFORE touching session', async () => {
      const { bridge, sessionManager, storage } = createBridge();
      const runSpy = vi.spyOn(sessionManager, 'runInSession');
      const getSpy = vi.spyOn(storage, 'getWithVersion');

      const nowSeconds = 1700000000;
      const expiredInitData = createSignedInitData(nowSeconds - 600);

      const result = await bridge.verifyAndDecideTmaGate(
        expiredInitData,
        botToken,
        {
          sessionKey: 'gate:tma-expired',
          expectedVersion: 1,
          decision: 'APPROVED',
          idempotencyKey: 'tma-idem-expired',
          currentTimeMs: nowSeconds * 1000,
        },
        300,
      );

      expect(result.authenticated).toBe(false);
      expect(result.applied).toBe(false);
      expect(result.tmaError).toBe('EXPIRED');
      expect(runSpy).not.toHaveBeenCalled();
      expect(getSpy).not.toHaveBeenCalled();
    });

    it('validates HMAC-SHA256 initData, runs atomic CAS via SessionManager.runInSession, and stores decision fields', async () => {
      const { bridge, sessionManager } = createBridge();
      const runSpy = vi.spyOn(sessionManager, 'runInSession');

      const nowSeconds = 1700000000;
      const initData = createSignedInitData(nowSeconds);

      const result = await bridge.verifyAndDecideTmaGate(initData, botToken, {
        sessionKey: 'gate:tma-valid',
        expectedVersion: 1,
        decision: 'APPROVED',
        idempotencyKey: 'tma-idem-1',
        scope: 'SINGLE_SYMBOL',
        symbol: 'SOL-PERP',
        maxSlippageBps: 40,
        currentTimeMs: nowSeconds * 1000,
      });

      expect(runSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        authenticated: true,
        applied: true,
        newVersion: 2,
        decidedByUserId: '987654321',
      });

      const loaded = await sessionManager.load('gate:tma-valid');
      expect(loaded.version).toBe(2);
      expect(loaded.value.data.status).toBe('APPROVED');
      expect(loaded.value.data.decidedByUserId).toBe('987654321');
      expect(loaded.value.data.idempotencyKey).toBe('tma-idem-1');
      expect(loaded.value.data.scope).toBe('SINGLE_SYMBOL');
      expect(loaded.value.data.symbol).toBe('SOL-PERP');
      expect(loaded.value.data.maxSlippageBps).toBe(40);
    });

    it('enforces idempotency on repeated idempotencyKey without double mutation', async () => {
      const { bridge, sessionManager, storage } = createBridge();
      const casSpy = vi.spyOn(storage, 'compareAndSet');

      const nowSeconds = 1700000000;
      const initData = createSignedInitData(nowSeconds);

      const first = await bridge.verifyAndDecideTmaGate(initData, botToken, {
        sessionKey: 'gate:tma-idem',
        expectedVersion: 1,
        decision: 'APPROVED',
        idempotencyKey: 'tma-idem-repeat',
        scope: 'ALL_POSITIONS',
        maxSlippageBps: 80,
        currentTimeMs: nowSeconds * 1000,
      });
      expect(first).toEqual({
        authenticated: true,
        applied: true,
        newVersion: 2,
        decidedByUserId: '987654321',
      });

      const writesAfterFirst = casSpy.mock.calls.length;

      const second = await bridge.verifyAndDecideTmaGate(initData, botToken, {
        sessionKey: 'gate:tma-idem',
        expectedVersion: 1,
        decision: 'REJECTED',
        idempotencyKey: 'tma-idem-repeat',
        scope: 'SINGLE_SYMBOL',
        symbol: 'BTC-PERP',
        maxSlippageBps: 10,
        currentTimeMs: nowSeconds * 1000,
      });

      expect(second).toEqual({
        authenticated: true,
        applied: true,
        newVersion: 2,
        idempotentHit: true,
        decidedByUserId: '987654321',
      });
      expect(casSpy.mock.calls.length).toBe(writesAfterFirst);

      const loaded = await sessionManager.load('gate:tma-idem');
      expect(loaded.version).toBe(2);
      expect(loaded.value.data.status).toBe('APPROVED');
      expect(loaded.value.data.scope).toBe('ALL_POSITIONS');
      expect(loaded.value.data.maxSlippageBps).toBe(80);
    });

    it('enforces atomic CAS expectedVersion check via SessionManager.runInSession on TMA decision', async () => {
      const { bridge, sessionManager } = createBridge();

      // Advance gate via Telegram bot callback first (version 1 -> 2)
      const botDecision = await bridge.decideGateCas('gate:tma-cas', 1, 'REJECTED', 'bot-user', {
        idempotencyKey: 'bot-idem-1',
        scope: 'ALL_POSITIONS',
        maxSlippageBps: 50,
      });
      expect(botDecision).toEqual({ applied: true, newVersion: 2 });

      // Stale TMA request with expectedVersion: 1 and a new idempotencyKey must fail CAS
      const nowSeconds = 1700000000;
      const initData = createSignedInitData(nowSeconds);
      const tmaDecision = await bridge.verifyAndDecideTmaGate(initData, botToken, {
        sessionKey: 'gate:tma-cas',
        expectedVersion: 1,
        decision: 'APPROVED',
        idempotencyKey: 'tma-idem-stale',
        scope: 'ALL_POSITIONS',
        maxSlippageBps: 50,
        currentTimeMs: nowSeconds * 1000,
      });

      expect(tmaDecision).toEqual({
        authenticated: true,
        applied: false,
        newVersion: 2,
        conflictReason: 'VERSION_MISMATCH',
        decidedByUserId: '987654321',
      });

      const loaded = await sessionManager.load('gate:tma-cas');
      expect(loaded.version).toBe(2);
      expect(loaded.value.data.status).toBe('REJECTED');
      expect(loaded.value.data.decidedByUserId).toBe('bot-user');
    });
  });
});
