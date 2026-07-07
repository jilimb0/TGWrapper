import type {
  Handler,
  Middleware,
  MiddlewareCandidate,
  RouteCandidate,
  SceneHooks,
} from '../types/core.js';

export interface Router<TContext> {
  command(command: string, handler: Handler<TContext>, priority?: number): void;
  command(
    command: string,
    middlewares: ReadonlyArray<Middleware<TContext>>,
    handler: Handler<TContext>,
    priority?: number,
  ): void;
  regex(pattern: RegExp, handler: Handler<TContext>, priority?: number): void;
  regex(
    pattern: RegExp,
    middlewares: ReadonlyArray<Middleware<TContext>>,
    handler: Handler<TContext>,
    priority?: number,
  ): void;
  callbackData(pattern: RegExp, handler: Handler<TContext>, priority?: number): void;
  callbackData(
    pattern: RegExp,
    middlewares: ReadonlyArray<Middleware<TContext>>,
    handler: Handler<TContext>,
    priority?: number,
  ): void;
  state(state: string, handler: Handler<TContext>, priority?: number): void;
  state(
    state: string,
    middlewares: ReadonlyArray<Middleware<TContext>>,
    handler: Handler<TContext>,
    priority?: number,
  ): void;
  use(handler: Handler<TContext>, priority?: number): void;
  use(
    middlewares: ReadonlyArray<Middleware<TContext>>,
    handler: Handler<TContext>,
    priority?: number,
  ): void;
  scene(
    state: string,
    handlers: ReadonlyArray<Handler<TContext>>,
    hooks?: SceneHooks<TContext>,
    priority?: number,
  ): void;
  getSceneHooks(state: string): SceneHooks<TContext> | undefined;
  useMiddleware(middleware: Middleware<TContext>, priority?: number): void;
  dispatch(ctx: TContext & RouterContextMeta): Promise<boolean>;
}

export interface RouterContextMeta {
  command?: string;
  text?: string;
  callbackData?: string;
  currentState?: string | null;
}

export class TreeRouter<TContext> implements Router<TContext> {
  private readonly routes: Array<RouteCandidate<TContext & RouterContextMeta>> = [];
  private sortedRoutesCache: Array<RouteCandidate<TContext & RouterContextMeta>> | null = null;
  private readonly sceneHooks = new Map<string, SceneHooks<TContext>>();
  private readonly globalMiddlewares: Array<MiddlewareCandidate<TContext & RouterContextMeta>> = [];
  private sortedMiddlewareCache: Array<MiddlewareCandidate<TContext & RouterContextMeta>> | null =
    null;

  // ── Route registration (overload-friendly) ─────────────────────────────────

  public command(
    command: string,
    handlerOrMiddlewares: Handler<TContext> | ReadonlyArray<Middleware<TContext>>,
    maybeHandlerOrPriority?: Handler<TContext> | number,
    maybePriority?: number,
  ): void {
    const { handler, priority } = this.resolve3or4(
      handlerOrMiddlewares,
      maybeHandlerOrPriority,
      maybePriority,
      100,
    );
    this.registerRoute('command', command, handlerOrMiddlewares, handler, priority);
  }

  public regex(
    pattern: RegExp,
    handlerOrMiddlewares: Handler<TContext> | ReadonlyArray<Middleware<TContext>>,
    maybeHandlerOrPriority?: Handler<TContext> | number,
    maybePriority?: number,
  ): void {
    const { handler, priority } = this.resolve3or4(
      handlerOrMiddlewares,
      maybeHandlerOrPriority,
      maybePriority,
      50,
    );
    this.registerRoute('regex', pattern, handlerOrMiddlewares, handler, priority);
  }

  public callbackData(
    pattern: RegExp,
    handlerOrMiddlewares: Handler<TContext> | ReadonlyArray<Middleware<TContext>>,
    maybeHandlerOrPriority?: Handler<TContext> | number,
    maybePriority?: number,
  ): void {
    const { handler, priority } = this.resolve3or4(
      handlerOrMiddlewares,
      maybeHandlerOrPriority,
      maybePriority,
      70,
    );
    this.registerRoute('callbackData', pattern, handlerOrMiddlewares, handler, priority);
  }

  public state(
    state: string,
    handlerOrMiddlewares: Handler<TContext> | ReadonlyArray<Middleware<TContext>>,
    maybeHandlerOrPriority?: Handler<TContext> | number,
    maybePriority?: number,
  ): void {
    const { handler, priority } = this.resolve3or4(
      handlerOrMiddlewares,
      maybeHandlerOrPriority,
      maybePriority,
      200,
    );
    this.registerRoute('state', state, handlerOrMiddlewares, handler, priority);
  }

  public scene(
    state: string,
    handlers: ReadonlyArray<Handler<TContext>>,
    hooks?: SceneHooks<TContext>,
    priority = 200,
  ): void {
    if (hooks) {
      this.sceneHooks.set(state, hooks);
    }

    handlers.forEach((h, index) => {
      this.state(state, h, priority - index);
    });
  }

  public getSceneHooks(state: string): SceneHooks<TContext> | undefined {
    return this.sceneHooks.get(state);
  }

  public use(
    handlerOrMiddlewares: Handler<TContext> | ReadonlyArray<Middleware<TContext>>,
    maybeHandlerOrPriority?: Handler<TContext> | number,
    maybePriority?: number,
  ): void {
    const { handler, priority } = this.resolve3or4(
      handlerOrMiddlewares,
      maybeHandlerOrPriority,
      maybePriority,
      0,
    );
    this.registerRoute('use', undefined, handlerOrMiddlewares, handler, priority);
  }

  // ── Middleware ─────────────────────────────────────────────────────────────

  public useMiddleware(middleware: Middleware<TContext>, priority = 0): void {
    this.globalMiddlewares.push({
      priority,
      fn: middleware as Middleware<TContext & RouterContextMeta>,
    });
    this.sortedMiddlewareCache = null;
  }

  // ── Dispatch ──────────────────────────────────────────────────────────────

  public async dispatch(ctx: TContext & RouterContextMeta): Promise<boolean> {
    const sorted = this.getSortedRoutes();
    for (const route of sorted) {
      if (!route.match(ctx)) {
        continue;
      }

      const pipeline = this.buildPipeline(route);
      await pipeline(ctx);
      return true;
    }

    return false;
  }

  // ── Overload resolver ─────────────────────────────────────────────────────

  /**
   * Resolve the 3-arg and 4-arg overload forms into a { handler, priority } pair.
   *
   * Overload 1: (match, handler, priority?)     → 3 args: handler, priority optional
   * Overload 2: (match, [mw], handler, priority?) → 4 args: [mw], handler, priority optional
   *
   * When called with 3 args: arg2 is handler-or-mw-array, arg3 is handler-or-priority
   *   - If arg3 is a function → overload 2 with 3 args (no priority)
   *   - If arg3 is number|undefined → overload 1
   * When called with 4 args: arg3 is always handler, arg4 is priority
   */
  private resolve3or4(
    handlerOrMiddlewares: Handler<TContext> | ReadonlyArray<Middleware<TContext>>,
    maybeHandlerOrPriority: Handler<TContext> | number | undefined,
    maybePriority: number | undefined,
    defaultPriority: number,
  ): { handler: Handler<TContext>; priority: number } {
    const hasMiddlewares = Array.isArray(handlerOrMiddlewares);

    if (hasMiddlewares) {
      // Overload 2: (match, [mw], handler, priority?)
      return {
        handler: maybeHandlerOrPriority as Handler<TContext>,
        priority: maybePriority ?? defaultPriority,
      };
    }

    // Overload 1: (match, handler, priority?)
    if (typeof maybeHandlerOrPriority === 'number' || maybeHandlerOrPriority === undefined) {
      return {
        handler: handlerOrMiddlewares as Handler<TContext>,
        priority: maybeHandlerOrPriority ?? defaultPriority,
      };
    }

    // Overload 1 with properly resolved Handler
    return {
      handler: handlerOrMiddlewares as Handler<TContext>,
      priority: defaultPriority,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private addRoute(route: RouteCandidate<TContext & RouterContextMeta>): void {
    this.routes.push(route);
    this.sortedRoutesCache = null;
  }

  private getSortedRoutes(): Array<RouteCandidate<TContext & RouterContextMeta>> {
    if (this.sortedRoutesCache) {
      return this.sortedRoutesCache;
    }

    this.sortedRoutesCache = [...this.routes].sort((a, b) => b.priority - a.priority);
    return this.sortedRoutesCache;
  }

  private getSortedMiddlewares(): Array<MiddlewareCandidate<TContext & RouterContextMeta>> {
    if (this.sortedMiddlewareCache) {
      return this.sortedMiddlewareCache;
    }
    this.sortedMiddlewareCache = [...this.globalMiddlewares].sort(
      (a, b) => b.priority - a.priority,
    );
    return this.sortedMiddlewareCache;
  }

  /**
   * Build a pipeline function that runs global middleware → route middleware → handler.
   */
  private buildPipeline(
    route: RouteCandidate<TContext & RouterContextMeta>,
  ): (ctx: TContext & RouterContextMeta) => Promise<void> {
    const middlewares = [
      ...this.getSortedMiddlewares(),
      ...(route.middlewares ?? []).map((fn) => ({
        priority: 0,
        fn: fn as Middleware<TContext & RouterContextMeta>,
      })),
    ];

    if (middlewares.length === 0) {
      return (ctx) => route.handler(ctx);
    }

    return async (ctx: TContext & RouterContextMeta) => {
      let index = 0;

      const next = async (): Promise<void> => {
        if (index < middlewares.length) {
          const mw = middlewares[index]!;
          index += 1;
          await mw.fn(ctx, next);
        } else {
          await route.handler(ctx);
        }
      };

      await next();
    };
  }

  /**
   * Unified route registration that handles both overloaded signatures:
   *   (match, handler, priority?)        — no middleware
   *   (match, [middleware], handler, priority?) — with middleware
   */
  private registerRoute(
    type: 'command' | 'regex' | 'callbackData' | 'state' | 'use',
    matchValue: string | RegExp | undefined,
    handlerOrMiddlewares: Handler<TContext> | ReadonlyArray<Middleware<TContext>>,
    handler: Handler<TContext>,
    priority: number,
  ): void {
    const hasMiddleware = Array.isArray(handlerOrMiddlewares);
    const route: RouteCandidate<TContext & RouterContextMeta> = {
      priority,
      match: this.buildMatchFn(type, matchValue),
      handler: handler as Handler<TContext & RouterContextMeta>,
    };

    if (hasMiddleware) {
      route.middlewares = handlerOrMiddlewares as ReadonlyArray<
        Middleware<TContext & RouterContextMeta>
      >;
    }

    this.addRoute(route);
  }

  private buildMatchFn(
    type: 'command' | 'regex' | 'callbackData' | 'state' | 'use',
    value: string | RegExp | undefined,
  ): (ctx: TContext & RouterContextMeta) => boolean {
    switch (type) {
      case 'command':
        return (ctx) => ctx.command === value;
      case 'regex':
        return (ctx) => typeof ctx.text === 'string' && (value as RegExp).test(ctx.text);
      case 'callbackData':
        return (ctx) => typeof ctx.callbackData === 'string' && (value as RegExp).test(ctx.callbackData);
      case 'state':
        return (ctx) => ctx.currentState === value;
      case 'use':
        return () => true;
    }
  }
}
