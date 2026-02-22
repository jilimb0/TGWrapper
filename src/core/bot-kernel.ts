import { Context } from './context.js';
import type { ApiClient } from './api-client.js';
import type { JsonObject } from '../types/core.js';
import type { SessionManager } from '../fsm/session-manager.js';
import type { TreeRouter } from '../router/router.js';
import type { Update } from '../types/telegram.js';

interface BotKernelOptions<TState extends string, TData extends JsonObject> {
  apiClient: ApiClient;
  sessionManager: SessionManager<TState, TData>;
  router: TreeRouter<Context<TState, TData>>;
  resolveSessionKey: (update: Update) => string | null;
  transitions?: Record<TState, readonly TState[]>;
  onTransition?: (from: TState | null, to: TState, sessionKey: string) => Promise<void>;
  onUpdate?: (update: Update, sessionKey: string) => Promise<void>;
  onError?: (error: unknown, update: Update, sessionKey: string) => Promise<void>;
}

export class BotKernel<TState extends string, TData extends JsonObject> {
  private readonly apiClient: ApiClient;
  private readonly sessionManager: SessionManager<TState, TData>;
  private readonly router: TreeRouter<Context<TState, TData>>;
  private readonly resolveSessionKey: (update: Update) => string | null;
  private readonly transitions: Record<TState, readonly TState[]>;
  private readonly onTransition: ((from: TState | null, to: TState, sessionKey: string) => Promise<void>) | undefined;
  private readonly onUpdate: ((update: Update, sessionKey: string) => Promise<void>) | undefined;
  private readonly onError: ((error: unknown, update: Update, sessionKey: string) => Promise<void>) | undefined;

  public constructor(options: BotKernelOptions<TState, TData>) {
    this.apiClient = options.apiClient;
    this.sessionManager = options.sessionManager;
    this.router = options.router;
    this.resolveSessionKey = options.resolveSessionKey;
    this.transitions = options.transitions ?? ({} as Record<TState, readonly TState[]>);
    this.onTransition = options.onTransition;
    this.onUpdate = options.onUpdate;
    this.onError = options.onError;
  }

  public async handleUpdate(update: Update): Promise<void> {
    const sessionKey = this.resolveSessionKey(update);
    if (!sessionKey) {
      return;
    }

    try {
      await this.onUpdate?.(update, sessionKey);
      await this.sessionManager.runInSession(sessionKey, async (session) => {
        let ctxRef: Context<TState, TData> | null = null;
        const ctx = new Context<TState, TData>({
          update,
          session,
          apiClient: this.apiClient,
          sceneController: {
            enter: async (nextState) => {
              this.assertTransitionAllowed(session.current_state, nextState as TState);
              const previous = session.current_state;
              const previousHooks = previous ? this.router.getSceneHooks(previous) : undefined;
              const nextHooks = this.router.getSceneHooks(nextState);

              if (previousHooks?.onLeave && ctxRef) {
                await previousHooks.onLeave(ctxRef);
              }

              session.current_state = nextState as TState;

              if (nextHooks?.onEnter && ctxRef) {
                await nextHooks.onEnter(ctxRef);
              }

              if (this.onTransition) {
                await this.onTransition(previous, nextState as TState, sessionKey);
              }
            },
            leave: async () => {
              const previous = session.current_state;
              const previousHooks = previous ? this.router.getSceneHooks(previous) : undefined;
              if (previousHooks?.onLeave && ctxRef) {
                await previousHooks.onLeave(ctxRef);
              }
              session.current_state = null;
            }
          }
        });
        ctxRef = ctx;

        await this.router.dispatch(Object.assign(ctx, this.extractRoutingMeta(ctx)));
      });
    } catch (error: unknown) {
      await this.onError?.(error, update, sessionKey);
      throw error;
    }
  }

  private extractRoutingMeta(ctx: Context<TState, TData>): {
    command?: string;
    text?: string;
    callbackData?: string;
    currentState?: string | null;
  } {
    const meta: { command?: string; text?: string; callbackData?: string; currentState?: string | null } = {
      currentState: ctx.session.current_state
    };

    const text = ctx.message?.text;
    if (text !== undefined) {
      meta.text = text;
    }

    const command = this.extractCommand(text, ctx.message?.entities);
    if (command !== undefined) {
      meta.command = command;
    }

    const callbackData = ctx.callbackQuery?.data;
    if (callbackData !== undefined) {
      meta.callbackData = callbackData;
    }

    return meta;
  }

  private extractCommand(
    text: string | undefined,
    entities: readonly { type: string; offset: number; length: number }[] | undefined
  ): string | undefined {
    if (!text || !entities) {
      return undefined;
    }

    const commandEntity = entities.find((entity) => entity.type === 'bot_command' && entity.offset === 0);
    if (!commandEntity) {
      return undefined;
    }

    const raw = text.slice(0, commandEntity.length);
    return raw.includes('@') ? raw.split('@')[0] : raw;
  }

  private assertTransitionAllowed(from: TState | null, to: TState): void {
    if (!from) {
      return;
    }
    const allowed = this.transitions[from];
    if (!allowed || allowed.includes(to)) {
      return;
    }

    throw new Error(`Transition from ${from} to ${to} is not allowed.`);
  }
}
