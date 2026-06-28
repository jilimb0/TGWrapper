import type { Logger, MetricsCollector, RuntimeHooks } from '../types/core.js';

export function createRuntimeHooks(logger?: Logger, metrics?: MetricsCollector): RuntimeHooks {
  return {
    onUpdate: async ({ updateType, tenantKey }) => {
      metrics?.increment('runtime_hook_updates', 1, {
        update_type: updateType,
        tenant: tenantKey,
      });
      logger?.log({
        level: 'debug',
        event: 'runtime_hook_on_update',
        timestamp: new Date().toISOString(),
        data: {
          update_type: updateType,
          tenant: tenantKey,
        },
      });
    },
    onError: async ({ updateType, tenantKey, error }) => {
      metrics?.increment('runtime_hook_errors', 1, {
        update_type: updateType,
        tenant: tenantKey,
      });
      logger?.log({
        level: 'error',
        event: 'runtime_hook_on_error',
        timestamp: new Date().toISOString(),
        data: {
          update_type: updateType,
          tenant: tenantKey,
          message: error instanceof Error ? error.message : 'unknown',
        },
      });
    },
  };
}
