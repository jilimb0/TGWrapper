import type { ApiMethods, Update } from './telegram.js';
import type { TelegramApiMethodName } from './telegram.schema.generated.js';
import type { TelegramApiMethodPayloads } from './telegram.payloads.generated.js';

export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue | undefined };

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEvent {
  level: LogLevel;
  event: string;
  timestamp: string;
  requestId?: string;
  data?: JsonObject;
}

export interface Logger {
  log(event: LogEvent): void;
}

export interface MetricsCollector {
  increment(metric: string, value?: number, tags?: Record<string, string>): void;
  observe(metric: string, value: number, tags?: Record<string, string>): void;
}

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterRatio: number;
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  cooldownMs: number;
  halfOpenMaxRequests: number;
}

export interface ApiClientOptions {
  token: string;
  baseUrl?: string;
  logger?: Logger;
  metrics?: MetricsCollector;
  retry?: Partial<RetryOptions>;
  fetchImpl?: typeof fetch;
  mockResponder?: (method: string, payload: JsonObject) => Promise<unknown>;
  circuitBreaker?: Partial<CircuitBreakerOptions>;
  onApiCall?: (event: ApiCallEvent) => void | Promise<void>;
  onApiResult?: (event: ApiResultEvent) => void | Promise<void>;
  onApiError?: (event: ApiErrorEvent) => void | Promise<void>;
}

export interface ApiCallEvent {
  requestId: string;
  method: string;
  attempt: number;
  payload: JsonObject;
}

export interface ApiResultEvent {
  requestId: string;
  method: string;
  attempt: number;
  durationMs: number;
}

export interface ApiErrorEvent {
  requestId: string;
  method: string;
  attempt: number;
  durationMs: number;
  retrying: boolean;
  retryDelayMs: number;
  error: unknown;
}

export interface SessionEnvelope<TState extends string, TData extends JsonObject> {
  current_state: TState | null;
  data: TData;
  version: number;
  encrypted: boolean;
  updated_at: string;
}

export interface VersionedValue<T> {
  value: T;
  version: number;
}

export interface CasResult<T> {
  ok: boolean;
  current?: VersionedValue<T>;
}

export interface SessionStorage<TSession> {
  get(key: string): Promise<TSession | null>;
  set(key: string, value: TSession): Promise<void>;
  delete(key: string): Promise<void>;
  getWithVersion(key: string): Promise<VersionedValue<TSession> | null>;
  compareAndSet(key: string, expectedVersion: number, nextValue: TSession): Promise<CasResult<TSession>>;
}

export interface ContextShortcuts {
  reply(text: string, extra?: JsonObject): Promise<unknown>;
  editMessage(text: string, extra?: JsonObject): Promise<unknown>;
  answerCallbackQuery(text?: string): Promise<unknown>;
}

export interface SceneHooks<TContext> {
  onEnter?: (ctx: TContext) => Promise<void>;
  onLeave?: (ctx: TContext) => Promise<void>;
}

export type Handler<TContext> = (ctx: TContext) => Promise<void>;

export interface RouteCandidate<TContext> {
  priority: number;
  match: (ctx: TContext) => boolean;
  handler: Handler<TContext>;
}

export interface PollingOptions {
  limit?: number;
  timeoutSeconds?: number;
  dropPendingUpdates?: boolean;
  signal?: AbortSignal;
}

export interface UpdateSource {
  run(onUpdate: (update: Update) => Promise<void>): Promise<void>;
  stop(): Promise<void>;
}

export interface RuntimeHooks {
  onUpdate?: (event: RuntimeUpdateEvent) => void | Promise<void>;
  onError?: (event: RuntimeErrorEvent) => void | Promise<void>;
}

export interface RuntimeUpdateEvent {
  update: Update;
  updateType: string;
  tenantKey: string;
  startedAt: string;
}

export interface RuntimeErrorEvent {
  update: Update;
  updateType: string;
  tenantKey: string;
  error: unknown;
  startedAt: string;
}

export interface RuntimeLifecycle {
  start(): Promise<void>;
  stop(): Promise<void>;
  onError(handler: (error: unknown) => void | Promise<void>): () => void;
  isRunning(): boolean;
}

export interface WebhookRequest {
  method: string;
  headers: Record<string, string | undefined>;
  rawBody: string;
  path?: string;
  query?: Record<string, string | undefined>;
}

export interface WebhookResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface WebhookHandlerOptions {
  secretToken: string;
  secretHeader?: string;
}

export type TelegramMethod = keyof ApiMethods;
export type TelegramMethodPayload<TMethod extends TelegramApiMethodName> = TelegramApiMethodPayloads[TMethod];
