import type { InputRichMessage, RichBlock } from '../types/telegram.js';

export const MAX_RICH_MESSAGE_LENGTH = 32_768;

export class RichMessageBuilder {
  private readonly blocks: RichBlock[] = [];

  public static create(): RichMessageBuilder {
    return new RichMessageBuilder();
  }

  public heading(level: 1 | 2 | 3, text: string): this {
    this.blocks.push({ type: 'heading', level, text });
    return this;
  }

  public text(
    content: string,
    entities?: Array<{ type: string; offset: number; length: number; [key: string]: unknown }>,
  ): this {
    this.blocks.push({ type: 'text', text: content, ...(entities ? { entities } : {}) });
    return this;
  }

  public table(headers: string[], rows: string[][]): this {
    this.blocks.push({ type: 'table', headers, rows });
    return this;
  }

  public list(items: string[], ordered = false): this {
    this.blocks.push({ type: 'list', items, ordered });
    return this;
  }

  public code(code: string, language?: string): this {
    this.blocks.push({ type: 'code', code, ...(language ? { language } : {}) });
    return this;
  }

  public expandableQuote(text: string): this {
    this.blocks.push({ type: 'expandable_quote', text });
    return this;
  }

  public document(fileId: string, caption?: string): this {
    this.blocks.push({ type: 'document', file_id: fileId, ...(caption ? { caption } : {}) });
    return this;
  }

  public button(text: string, options: { url?: string; callbackData?: string }): this {
    this.blocks.push({
      type: 'button',
      text,
      ...(options.url ? { url: options.url } : {}),
      ...(options.callbackData ? { callback_data: options.callbackData } : {}),
    });
    return this;
  }

  public addBlock(block: RichBlock): this {
    this.blocks.push(block);
    return this;
  }

  public build(): InputRichMessage {
    const totalCharCount = this.calculateEstimatedLength();
    if (totalCharCount > MAX_RICH_MESSAGE_LENGTH) {
      throw new Error(
        `Rich message estimated length (${totalCharCount}) exceeds maximum allowed of ${MAX_RICH_MESSAGE_LENGTH} characters.`,
      );
    }
    return {
      blocks: [...this.blocks],
    };
  }

  private calculateEstimatedLength(): number {
    let count = 0;
    for (const b of this.blocks) {
      if ('text' in b && typeof b.text === 'string') count += b.text.length;
      if ('code' in b && typeof b.code === 'string') count += b.code.length;
      if ('headers' in b && Array.isArray(b.headers)) {
        count += b.headers.reduce((acc, h) => acc + (typeof h === 'string' ? h.length : 0), 0);
      }
      if ('rows' in b && Array.isArray(b.rows)) {
        for (const row of b.rows) {
          count += (row as string[]).reduce((acc: number, c: string) => acc + (typeof c === 'string' ? c.length : 0), 0);
        }
      }
      if ('items' in b && Array.isArray(b.items)) {
        count += b.items.reduce((acc, it) => acc + (typeof it === 'string' ? it.length : 0), 0);
      }
    }
    return count;
  }
}
