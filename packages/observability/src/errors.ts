import type { ErrorClass, ObservabilityError } from './types.js';

export function classifyError(error: unknown, source = 'unknown'): ObservabilityError {
  const input = error as {
    name?: string;
    message?: string;
    code?: string;
    retryable?: boolean;
    class?: ErrorClass;
  };
  const message = input?.message ?? 'unknown';
  const code = typeof input?.code === 'string' ? input.code : 'UNKNOWN';
  const retryable = Boolean(input?.retryable);

  const name = (input?.name ?? '').toLowerCase();
  const explicitClass = input?.class;
  if (explicitClass) {
    return { class: explicitClass, code, retryable, source, message };
  }
  if (name.includes('redis') || name.includes('db')) {
    return { class: 'db', code, retryable, source, message };
  }
  if (name.includes('queue')) {
    return { class: 'queue', code, retryable, source, message };
  }
  if (name.includes('api') || code.startsWith('API_')) {
    return { class: 'api', code, retryable, source, message };
  }
  if (name.includes('network') || name.includes('fetch') || code.startsWith('NET_')) {
    return { class: 'transport', code, retryable, source, message };
  }
  if (name.length > 0) {
    return { class: 'runtime', code, retryable, source, message };
  }
  return { class: 'unknown', code, retryable, source, message };
}
