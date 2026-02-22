import type { ApiClientOptions, Logger, MetricsCollector } from '../types/core.js';

export function createApiHooks(logger?: Logger, metrics?: MetricsCollector): Pick<ApiClientOptions, 'onApiCall' | 'onApiResult' | 'onApiError'> {
  return {
    onApiCall: async ({ method }) => {
      metrics?.increment('runtime_hook_api_calls', 1, { method });
    },
    onApiResult: async ({ method, durationMs }) => {
      metrics?.observe('runtime_hook_api_duration_ms', durationMs, { method });
    },
    onApiError: async ({ method, error, retrying }) => {
      metrics?.increment('runtime_hook_api_errors', 1, { method, retrying: retrying ? 'true' : 'false' });
      logger?.log({
        level: 'error',
        event: 'runtime_hook_api_error',
        timestamp: new Date().toISOString(),
        data: {
          method,
          retrying,
          message: error instanceof Error ? error.message : 'unknown'
        }
      });
    }
  };
}
