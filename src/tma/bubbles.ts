import { computeInitDataHash } from './validate-init-data.js';

export const MAX_HTML_BUBBLE_SIZE_BYTES = 32_768; // 32 KB sandbox limit

export interface HtmlBubbleOptions {
  html: string;
  css?: string;
  script?: string;
  initialState?: Record<string, unknown>;
  tonConnectManifestUrl?: string;
  maxSizeBytes?: number;
}

export interface HtmlBubblePayload {
  bundle: string;
  byteLength: number;
  initialStateJson?: string;
  tonConnectManifestUrl?: string;
}

export class HtmlBubbleSizeLimitError extends Error {
  public constructor(public readonly byteLength: number, public readonly limit: number) {
    super(`HTMLBubble payload size (${byteLength} bytes) exceeds limit of ${limit} bytes.`);
    this.name = 'HtmlBubbleSizeLimitError';
  }
}

export class HtmlBubbleSecurityError extends Error {
  public constructor(message: string) {
    super(`HTMLBubble sandbox security violation: ${message}`);
    this.name = 'HtmlBubbleSecurityError';
  }
}

/**
 * Validates sandbox safety: forbids external networking or forbidden script schemes.
 */
export function validateBubbleSandboxSafety(code: string): void {
  // Disallow forbidden external HTTP/WS networking inside message bubble sandbox
  const forbiddenPatterns = [
    { pattern: /\b(fetch|XMLHttpRequest|WebSocket)\b/i, name: 'network request APIs' },
    { pattern: /<script[^>]+src=["']http/i, name: 'external script source' },
    { pattern: /<link[^>]+href=["']http/i, name: 'external stylesheet' },
  ];

  for (const { pattern, name } of forbiddenPatterns) {
    if (pattern.test(code)) {
      throw new HtmlBubbleSecurityError(`Usage of ${name} is blocked in HTMLBubble sandbox.`);
    }
  }
}

/**
 * Minifies and packages HTML, CSS and JS into a validated, compact HTMLBubble bundle.
 */
export function createHtmlBubblePayload(options: HtmlBubbleOptions): HtmlBubblePayload {
  const maxBytes = options.maxSizeBytes ?? MAX_HTML_BUBBLE_SIZE_BYTES;

  const styleTag = options.css ? `<style>${options.css.trim()}</style>` : '';
  const stateTag = options.initialState
    ? `<script type="application/json" id="__STATE__">${JSON.stringify(options.initialState)}</script>`
    : '';
  const scriptTag = options.script ? `<script>${options.script.trim()}</script>` : '';

  const bundle = `${styleTag}${stateTag}${options.html.trim()}${scriptTag}`;

  validateBubbleSandboxSafety(bundle);

  const encoder = new TextEncoder();
  const byteLength = encoder.encode(bundle).byteLength;

  if (byteLength > maxBytes) {
    throw new HtmlBubbleSizeLimitError(byteLength, maxBytes);
  }

  return {
    bundle,
    byteLength,
    ...(options.initialState ? { initialStateJson: JSON.stringify(options.initialState) } : {}),
    ...(options.tonConnectManifestUrl ? { tonConnectManifestUrl: options.tonConnectManifestUrl } : {}),
  };
}

/**
 * Signs HTMLBubble state using HMAC-SHA256 for tampering prevention.
 */
export function signBubbleState(state: Record<string, unknown>, botToken: string): string {
  const serialized = JSON.stringify(state, Object.keys(state).sort());
  return computeInitDataHash(`state=${encodeURIComponent(serialized)}`, botToken);
}

/**
 * Verifies the integrity of HTMLBubble returned state against its HMAC signature.
 */
export function verifyBubbleState(
  state: Record<string, unknown>,
  signature: string,
  botToken: string,
): boolean {
  const expected = signBubbleState(state, botToken);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}
