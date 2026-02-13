import type { Handler, RouteCandidate, SceneHooks } from '../types/core.js';

export interface Router<TContext> {
  command(command: string, handler: Handler<TContext>, priority?: number): void;
  regex(pattern: RegExp, handler: Handler<TContext>, priority?: number): void;
  callbackData(pattern: RegExp, handler: Handler<TContext>, priority?: number): void;
  state(state: string, handler: Handler<TContext>, priority?: number): void;
  use(handler: Handler<TContext>, priority?: number): void;
  scene(state: string, handlers: ReadonlyArray<Handler<TContext>>, hooks?: SceneHooks<TContext>, priority?: number): void;
  getSceneHooks(state: string): SceneHooks<TContext> | undefined;
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
  private readonly sceneHooks = new Map<string, SceneHooks<TContext>>();

  public command(command: string, handler: Handler<TContext>, priority = 100): void {
    this.routes.push({
      priority,
      match: (ctx) => ctx.command === command,
      handler: handler as Handler<TContext & RouterContextMeta>
    });
  }

  public regex(pattern: RegExp, handler: Handler<TContext>, priority = 50): void {
    this.routes.push({
      priority,
      match: (ctx) => typeof ctx.text === 'string' && pattern.test(ctx.text),
      handler: handler as Handler<TContext & RouterContextMeta>
    });
  }

  public callbackData(pattern: RegExp, handler: Handler<TContext>, priority = 70): void {
    this.routes.push({
      priority,
      match: (ctx) => typeof ctx.callbackData === 'string' && pattern.test(ctx.callbackData),
      handler: handler as Handler<TContext & RouterContextMeta>
    });
  }

  public state(state: string, handler: Handler<TContext>, priority = 200): void {
    this.routes.push({
      priority,
      match: (ctx) => ctx.currentState === state,
      handler: handler as Handler<TContext & RouterContextMeta>
    });
  }

  public scene(
    state: string,
    handlers: ReadonlyArray<Handler<TContext>>,
    hooks?: SceneHooks<TContext>,
    priority = 200
  ): void {
    if (hooks) {
      this.sceneHooks.set(state, hooks);
    }

    handlers.forEach((handler, index) => {
      this.state(state, handler, priority - index);
    });
  }

  public getSceneHooks(state: string): SceneHooks<TContext> | undefined {
    return this.sceneHooks.get(state);
  }

  public use(handler: Handler<TContext>, priority = 0): void {
    this.routes.push({
      priority,
      match: () => true,
      handler: handler as Handler<TContext & RouterContextMeta>
    });
  }

  public async dispatch(ctx: TContext & RouterContextMeta): Promise<boolean> {
    const sorted = [...this.routes].sort((a, b) => b.priority - a.priority);
    for (const route of sorted) {
      if (!route.match(ctx)) {
        continue;
      }

      await route.handler(ctx);
      return true;
    }

    return false;
  }
}
