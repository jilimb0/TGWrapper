export interface TenantScope {
  tenantId: string;
  botId: string;
}

export function createSessionNamespace(scope: TenantScope): string {
  return `framework:${scope.tenantId}:${scope.botId}:session`;
}

export function createSessionKey(scope: TenantScope, userId: string): string {
  return `${createSessionNamespace(scope)}:${userId}`;
}
