import { describe, expect, it } from 'vitest';
import {
  MAX_WIDGET_COMPRESSED_BYTES,
  MAX_WIDGET_DATA_BYTES,
  MAX_WIDGET_HTML_BYTES,
  WidgetSizeLimitError,
  clampWidgetDimensions,
  createWidgetPayload,
  signWidgetState,
  validateWidgetData,
  validateWidgetHtml,
  verifyWidgetState,
} from '../src/tma/widgets.js';

describe('TMA Native Widgets (Bot API 10.4)', () => {
  describe('validateWidgetHtml', () => {
    it('accepts valid HTML within 32 KB raw and 4 KB compressed limits', () => {
      const html = '<div class="widget"><h1>My Widget</h1><p>Interactive tool</p></div>';
      const result = validateWidgetHtml(html);
      expect(result.byteLength).toBeGreaterThan(0);
      expect(result.byteLength).toBeLessThanOrEqual(MAX_WIDGET_HTML_BYTES);
      expect(result.compressedByteLength).toBeLessThanOrEqual(MAX_WIDGET_COMPRESSED_BYTES);
    });

    it('throws WidgetSizeLimitError when raw HTML exceeds 32 KB', () => {
      const hugeHtml = 'a'.repeat(MAX_WIDGET_HTML_BYTES + 1);
      expect(() => validateWidgetHtml(hugeHtml)).toThrow(WidgetSizeLimitError);
      expect(() => validateWidgetHtml(hugeHtml)).toThrow(/raw_html size/);
    });

    it('throws WidgetSizeLimitError when compressed HTML exceeds 4 KB', () => {
      // Incompressible random data under 32 KB raw limit that exceeds 4 KB when compressed
      const highEntropyBytes = new Uint8Array(6000);
      for (let i = 0; i < highEntropyBytes.length; i++) {
        highEntropyBytes[i] = Math.floor(Math.random() * 256);
      }
      const randomData = new TextDecoder('latin1').decode(highEntropyBytes);
      expect(() => validateWidgetHtml(randomData)).toThrow(WidgetSizeLimitError);
      expect(() => validateWidgetHtml(randomData)).toThrow(/compressed_html size/);
    });
  });

  describe('clampWidgetDimensions', () => {
    it('clamps width to >= 200 logical pixels', () => {
      expect(clampWidgetDimensions(100).width).toBe(200);
      expect(clampWidgetDimensions(350).width).toBe(350);
      expect(clampWidgetDimensions().width).toBeUndefined();
    });

    it('clamps height between 50 and 600 logical pixels', () => {
      expect(clampWidgetDimensions(undefined, 20).height).toBe(50);
      expect(clampWidgetDimensions(undefined, 400).height).toBe(400);
      expect(clampWidgetDimensions(undefined, 900).height).toBe(600);
      expect(clampWidgetDimensions().height).toBeUndefined();
    });
  });

  describe('validateWidgetData', () => {
    it('accepts data up to 1024 bytes', () => {
      expect(() => validateWidgetData('key=value', 'public_data')).not.toThrow();
      expect(() => validateWidgetData(undefined, 'public_data')).not.toThrow();
    });

    it('throws WidgetSizeLimitError when exceeding 1024 bytes', () => {
      const oversized = 'x'.repeat(MAX_WIDGET_DATA_BYTES + 1);
      expect(() => validateWidgetData(oversized, 'public_data')).toThrow(WidgetSizeLimitError);
      expect(() => validateWidgetData(oversized, 'chat_data')).toThrow(WidgetSizeLimitError);
    });
  });

  describe('createWidgetPayload', () => {
    it('creates validated payload with clamped dimensions and optional fields', () => {
      const payload = createWidgetPayload({
        html: '<div id="app">Widget UI</div>',
        width: 150, // will clamp to 200
        height: 800, // will clamp to 600
        publicData: 'v=1',
        chatData: 'user=42',
        allowQueries: true,
        isShared: true,
      });

      expect(payload).toEqual({
        html: '<div id="app">Widget UI</div>',
        width: 200,
        height: 600,
        public_data: 'v=1',
        chat_data: 'user=42',
        allow_queries: true,
        is_shared: true,
      });
    });
  });

  describe('signWidgetState & verifyWidgetState', () => {
    const token = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';

    it('signs and verifies state round-trip', () => {
      const state = { score: 100, level: 3, item: 'sword' };
      const sig = signWidgetState(state, token);

      expect(typeof sig).toBe('string');
      expect(verifyWidgetState(state, sig, token)).toBe(true);
    });

    it('rejects tampered state or wrong token', () => {
      const state = { score: 100 };
      const sig = signWidgetState(state, token);

      expect(verifyWidgetState({ score: 101 }, sig, token)).toBe(false);
      expect(verifyWidgetState(state, sig, 'other_token')).toBe(false);
    });
  });
});
