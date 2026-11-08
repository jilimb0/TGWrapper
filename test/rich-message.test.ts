import { describe, expect, it } from 'vitest';
import { MAX_RICH_MESSAGE_LENGTH, RichMessageBuilder } from '../src/core/rich-message.js';

describe('RichMessageBuilder', () => {
  it('builds structured rich message with tables, expandable quotes and buttons', () => {
    const rich = RichMessageBuilder.create()
      .heading(1, 'Executive Summary')
      .text('Below is the quarterly report:')
      .table(['Metric', 'Value'], [
        ['Revenue', '$1.2M'],
        ['Growth', '+24%'],
      ])
      .expandableQuote('This is an expandable quotation block with detailed footnote.')
      .code('const status = "ok";', 'typescript')
      .button('Open Dashboard', { url: 'https://example.com' })
      .build();

    expect(rich.blocks).toHaveLength(6);
    expect(rich.blocks[0]).toEqual({ type: 'heading', level: 1, text: 'Executive Summary' });
    expect(rich.blocks[2]).toEqual({
      type: 'table',
      headers: ['Metric', 'Value'],
      rows: [
        ['Revenue', '$1.2M'],
        ['Growth', '+24%'],
      ],
    });
    expect(rich.blocks[3]).toEqual({
      type: 'expandable_quote',
      text: 'This is an expandable quotation block with detailed footnote.',
    });
  });

  it('enforces character budget limit <= 32768 chars', () => {
    const builder = RichMessageBuilder.create();
    builder.text('A'.repeat(MAX_RICH_MESSAGE_LENGTH + 10));

    expect(() => builder.build()).toThrowError(/exceeds maximum allowed of 32768/);
  });
});
