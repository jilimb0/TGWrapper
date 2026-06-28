import { ApiClient } from '../core/api-client.js';
import type { JsonObject } from '../types/core.js';

export interface MockApiCall {
  method: string;
  payload: JsonObject;
}

export class MockApiClient extends ApiClient {
  private readonly callsLog: MockApiCall[] = [];
  private readonly results = new Map<string, unknown>();

  public constructor() {
    super({
      token: 'test-token',
      baseUrl: 'https://api.telegram.org',
      mockResponder: async (method, payload) => {
        this.callsLog.push({ method, payload });
        if (this.results.has(method)) {
          return this.results.get(method);
        }
        return true;
      },
    });
  }

  public setResult(method: string, result: unknown): void {
    this.results.set(method, result);
  }

  public get calls(): readonly MockApiCall[] {
    return this.callsLog;
  }

  public lastCall(): MockApiCall | undefined {
    return this.callsLog[this.callsLog.length - 1];
  }

  public reset(): void {
    this.callsLog.length = 0;
    this.results.clear();
  }
}
