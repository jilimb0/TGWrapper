import { SessionConflictError } from '../core/errors.js';
import type { SessionManager } from '../fsm/session-manager.js';
import type { TmaErrorCode, ValidateInitDataOptions } from '../tma/types.js';
import { parseAndValidateInitData, validateInitData } from '../tma/validate-init-data.js';
import type { JsonObject } from '../types/core.js';

const MAX_IDEMPOTENCY_HISTORY = 50;

export type GateDecisionScope = 'ALL_POSITIONS' | 'SINGLE_SYMBOL';

export type GateDecisionStatus = 'APPROVED' | 'REJECTED' | 'STEERED';

export interface GateDecisionCachedResult extends JsonObject {
  applied: boolean;
  newVersion: number;
  conflictReason?: 'VERSION_MISMATCH' | 'GATE_NOT_FOUND';
}

export interface ApprovalGateData extends JsonObject {
  gateId: string;
  status: 'PENDING' | GateDecisionStatus;
  riskLevel: 'MODERATE' | 'HIGH' | 'CRITICAL';
  actionSummary: string;
  unifiedDiff?: string;
  steerInstruction?: string;
  decidedByUserId?: string;
  idempotencyKey?: string;
  scope?: GateDecisionScope;
  symbol?: string;
  maxSlippageBps?: number;
  lastIdempotencyKeys?: string[];
  idempotencyResults?: Record<string, GateDecisionCachedResult>;
}

export interface GateDecisionResult {
  applied: boolean;
  newVersion: number;
  idempotentHit?: boolean;
  conflictReason?: 'VERSION_MISMATCH' | 'GATE_NOT_FOUND';
}

export interface DecideGateCasOptions {
  steerInstruction?: string | undefined;
  idempotencyKey?: string | undefined;
  scope?: GateDecisionScope | undefined;
  symbol?: string | undefined;
  maxSlippageBps?: number | undefined;
}

export interface TmaGateDecisionInput {
  sessionKey: string;
  expectedVersion: number;
  decision: GateDecisionStatus;
  idempotencyKey?: string | undefined;
  scope?: GateDecisionScope | undefined;
  symbol?: string | undefined;
  maxSlippageBps?: number | undefined;
  steerInstruction?: string | undefined;
  userId?: string | undefined;
  currentTimeMs?: number | undefined;
}

export interface TmaGateDecisionResult extends GateDecisionResult {
  authenticated: boolean;
  tmaError?: TmaErrorCode;
  decidedByUserId?: string;
}

class AbortSessionWriteError extends Error {
  public readonly result: GateDecisionResult;

  public constructor(result: GateDecisionResult) {
    super('Abort session write without mutation');
    this.name = 'AbortSessionWriteError';
    this.result = result;
  }
}

function resolveCasOptions(
  steerOrOptions?: string | DecideGateCasOptions,
  extraOptions?: DecideGateCasOptions,
): DecideGateCasOptions {
  if (typeof steerOrOptions === 'string') {
    return {
      ...extraOptions,
      steerInstruction: steerOrOptions,
    };
  }
  if (steerOrOptions && typeof steerOrOptions === 'object') {
    return {
      ...steerOrOptions,
      ...extraOptions,
    };
  }
  return extraOptions ?? {};
}

function findCachedDecision(
  data: ApprovalGateData,
  currentVersion: number,
  idempotencyKey?: string,
): GateDecisionResult | undefined {
  if (!idempotencyKey) {
    return undefined;
  }
  const cached = data.idempotencyResults?.[idempotencyKey];
  if (cached) {
    return {
      applied: cached.applied,
      newVersion: cached.newVersion,
      idempotentHit: true,
      ...(cached.conflictReason !== undefined ? { conflictReason: cached.conflictReason } : {}),
    };
  }
  if (
    data.idempotencyKey === idempotencyKey ||
    data.lastIdempotencyKeys?.includes(idempotencyKey)
  ) {
    return {
      applied: true,
      newVersion: currentVersion,
      idempotentHit: true,
    };
  }
  return undefined;
}

export class ApprovalGateBotBridge {
  private readonly sessionManager: SessionManager<string, ApprovalGateData>;

  public constructor(sessionManager: SessionManager<string, ApprovalGateData>) {
    this.sessionManager = sessionManager;
  }

  /**
   * Applies an approval gate decision atomically using SessionManager CAS,
   * optionally enforcing idempotency by `idempotencyKey` and recording scope/slippage metadata.
   */
  public async decideGateCas(
    sessionKey: string,
    expectedVersion: number,
    decision: GateDecisionStatus,
    userId: string,
    steerOrOptions?: string | DecideGateCasOptions,
    extraOptions?: DecideGateCasOptions,
  ): Promise<GateDecisionResult> {
    const options = resolveCasOptions(steerOrOptions, extraOptions);

    try {
      return await this.sessionManager.runInSession(sessionKey, async (session) => {
        const cached = findCachedDecision(session.data, session.version, options.idempotencyKey);
        if (cached) {
          throw new AbortSessionWriteError(cached);
        }

        if (session.version !== expectedVersion) {
          throw new AbortSessionWriteError({
            applied: false,
            newVersion: session.version,
            conflictReason: 'VERSION_MISMATCH',
          });
        }

        const nextVersion = session.version + 1;
        session.data.status = decision;
        session.data.decidedByUserId = userId;
        if (options.steerInstruction !== undefined) {
          session.data.steerInstruction = options.steerInstruction;
        }
        if (options.scope !== undefined) {
          session.data.scope = options.scope;
          if (options.scope === 'ALL_POSITIONS' && options.symbol === undefined) {
            delete session.data.symbol;
          }
        }
        if (options.symbol !== undefined) {
          session.data.symbol = options.symbol;
        }
        if (options.maxSlippageBps !== undefined) {
          session.data.maxSlippageBps = options.maxSlippageBps;
        }

        const result: GateDecisionResult = {
          applied: true,
          newVersion: nextVersion,
        };

        if (options.idempotencyKey !== undefined) {
          session.data.idempotencyKey = options.idempotencyKey;
          const prevKeys = Array.isArray(session.data.lastIdempotencyKeys)
            ? session.data.lastIdempotencyKeys
            : [];
          const nextKeys = [...prevKeys, options.idempotencyKey].slice(-MAX_IDEMPOTENCY_HISTORY);
          session.data.lastIdempotencyKeys = nextKeys;

          const prevResults = session.data.idempotencyResults ?? {};
          const nextResults: Record<string, GateDecisionCachedResult> = {};
          for (const key of nextKeys) {
            if (key === options.idempotencyKey) {
              nextResults[key] = { applied: true, newVersion: nextVersion };
            } else {
              const existing = prevResults[key];
              if (existing) {
                nextResults[key] = existing;
              }
            }
          }
          session.data.idempotencyResults = nextResults;
        }

        return result;
      });
    } catch (err) {
      if (err instanceof AbortSessionWriteError) {
        return err.result;
      }
      if (err instanceof SessionConflictError) {
        return {
          applied: false,
          newVersion: expectedVersion,
          conflictReason: 'VERSION_MISMATCH',
        };
      }
      throw err;
    }
  }

  /**
   * Validates Telegram Mini App `initData` (HMAC-SHA256 + freshness) before touching session,
   * then applies the gate decision with idempotency and atomic CAS protection.
   */
  public async verifyAndDecideTmaGate(
    initDataRaw: string,
    botToken: string,
    input: TmaGateDecisionInput,
    maxAgeSeconds?: number,
  ): Promise<TmaGateDecisionResult> {
    const validationOptions: ValidateInitDataOptions = {};
    if (maxAgeSeconds !== undefined) {
      validationOptions.maxAgeSeconds = maxAgeSeconds;
    }
    if (input.currentTimeMs !== undefined) {
      validationOptions.currentTimeMs = input.currentTimeMs;
    }

    const isValid = validateInitData(initDataRaw, botToken, validationOptions);
    const parsed = parseAndValidateInitData(initDataRaw, botToken, validationOptions);
    if (!isValid || !parsed.valid) {
      return {
        authenticated: false,
        applied: false,
        newVersion: input.expectedVersion,
        ...(parsed.error !== undefined ? { tmaError: parsed.error } : {}),
      };
    }

    const verifiedUserId =
      parsed.data?.user?.id !== undefined
        ? String(parsed.data.user.id)
        : (input.userId ?? 'unknown');

    const casResult = await this.decideGateCas(
      input.sessionKey,
      input.expectedVersion,
      input.decision,
      verifiedUserId,
      {
        steerInstruction: input.steerInstruction,
        idempotencyKey: input.idempotencyKey,
        scope: input.scope,
        symbol: input.symbol,
        maxSlippageBps: input.maxSlippageBps,
      },
    );

    return {
      ...casResult,
      authenticated: true,
      decidedByUserId: verifiedUserId,
    };
  }
}
