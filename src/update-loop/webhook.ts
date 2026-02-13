import type { Update } from '../types/telegram.js';
import type { UpdateSource } from '../types/core.js';
import { isValidTelegramUpdate } from './update-validator.js';

export interface WebhookValidationOptions {
  headerName: string;
  secretToken: string;
}

export class WebhookSource implements UpdateSource {
  private readonly updates: Update[] = [];
  private running = false;

  public async run(onUpdate: (update: Update) => Promise<void>): Promise<void> {
    this.running = true;
    while (this.running) {
      const next = this.updates.shift();
      if (!next) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        continue;
      }
      await onUpdate(next);
    }
  }

  public async stop(): Promise<void> {
    this.running = false;
  }

  public ingest(update: unknown): void {
    if (!isValidTelegramUpdate(update)) {
      return;
    }
    this.updates.push(update);
  }

  public validateSignature(headers: Record<string, string | undefined>, options: WebhookValidationOptions): boolean {
    const current = headers[options.headerName.toLowerCase()] ?? headers[options.headerName];
    return current === options.secretToken;
  }
}
