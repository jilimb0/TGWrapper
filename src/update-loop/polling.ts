import type { ApiClient } from '../core/api-client.js';
import type { PollingOptions, UpdateSource } from '../types/core.js';
import type { Update } from '../types/telegram.js';
import { isFreshUpdate, isValidTelegramUpdate } from './update-validator.js';

interface InternalPollingOptions {
  limit: number;
  timeoutSeconds: number;
  dropPendingUpdates: boolean;
  signal: AbortSignal | undefined;
}

export class PollingSource implements UpdateSource {
  private readonly apiClient: ApiClient;
  private readonly options: InternalPollingOptions;
  private running = false;
  private offset = 0;

  public constructor(apiClient: ApiClient, options: PollingOptions = {}) {
    this.apiClient = apiClient;
    this.options = {
      limit: options.limit ?? 100,
      timeoutSeconds: options.timeoutSeconds ?? 30,
      dropPendingUpdates: options.dropPendingUpdates ?? true,
      signal: options.signal,
    };
  }

  public async run(onUpdate: (update: Update) => Promise<void>): Promise<void> {
    this.running = true;

    while (this.running && !this.options.signal?.aborted) {
      const response = await this.apiClient.callApi('getUpdates', {
        offset: this.offset,
        timeout: this.options.timeoutSeconds,
        limit: this.options.limit,
      });

      if (!Array.isArray(response)) {
        continue;
      }

      for (const candidate of response) {
        if (!isValidTelegramUpdate(candidate)) {
          continue;
        }

        const update = candidate as Update;
        this.offset = update.update_id + 1;

        if (this.options.dropPendingUpdates && !isFreshUpdate(update)) {
          continue;
        }

        await onUpdate(update);
      }
    }
  }

  public async stop(): Promise<void> {
    this.running = false;
  }
}
