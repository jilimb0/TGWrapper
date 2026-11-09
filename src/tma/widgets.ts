import { deflateSync } from 'node:zlib';
import { computeInitDataHash } from './validate-init-data.js';

export const MAX_WIDGET_HTML_BYTES = 32_768; // 32 KB raw limit
export const MAX_WIDGET_COMPRESSED_BYTES = 4_096; // 4 KB zlib deflate limit
export const MAX_WIDGET_DATA_BYTES = 1_024; // 1 KB public_data/chat_data limit
export const MIN_WIDGET_WIDTH = 200;
export const MIN_WIDGET_HEIGHT = 50;
export const MAX_WIDGET_HEIGHT = 600;

export interface WidgetValidationResult {
  byteLength: number;
  compressedByteLength: number;
}

export class WidgetSizeLimitError extends Error {
  public constructor(
    public readonly type: 'raw_html' | 'compressed_html' | 'public_data' | 'chat_data',
    public readonly actual: number,
    public readonly limit: number,
  ) {
    super(`Widget ${type} size (${actual} bytes) exceeds Bot API 10.4 limit of ${limit} bytes.`);
    this.name = 'WidgetSizeLimitError';
  }
}

/**
 * Validates native HTML widget code according to Telegram Bot API 10.4 constraints:
 * - 1 to 32,768 bytes raw UTF-8 HTML
 * - <= 4,096 bytes when compressed with zlib (max compression level 9)
 */
export function validateWidgetHtml(html: string): WidgetValidationResult {
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(html);
  const byteLength = rawBytes.byteLength;

  if (byteLength < 1 || byteLength > MAX_WIDGET_HTML_BYTES) {
    throw new WidgetSizeLimitError('raw_html', byteLength, MAX_WIDGET_HTML_BYTES);
  }

  const compressed = deflateSync(rawBytes, { level: 9 });
  const compressedByteLength = compressed.byteLength;

  if (compressedByteLength > MAX_WIDGET_COMPRESSED_BYTES) {
    throw new WidgetSizeLimitError('compressed_html', compressedByteLength, MAX_WIDGET_COMPRESSED_BYTES);
  }

  return { byteLength, compressedByteLength };
}

/**
 * Validates public_data and chat_data payload sizes (0-1024 bytes).
 */
export function validateWidgetData(data: string | undefined, field: 'public_data' | 'chat_data'): void {
  if (data === undefined) return;
  const byteLength = new TextEncoder().encode(data).byteLength;
  if (byteLength > MAX_WIDGET_DATA_BYTES) {
    throw new WidgetSizeLimitError(field, byteLength, MAX_WIDGET_DATA_BYTES);
  }
}

/**
 * Clamps widget dimensions to Bot API 10.4 standards:
 * - width: clamped to >= 200 logical pixels
 * - height: clamped between 50 and 600 logical pixels
 */
export function clampWidgetDimensions(
  width?: number,
  height?: number,
): { width?: number; height?: number } {
  const result: { width?: number; height?: number } = {};
  if (width !== undefined) {
    result.width = Math.max(MIN_WIDGET_WIDTH, Math.floor(width));
  }
  if (height !== undefined) {
    result.height = Math.min(MAX_WIDGET_HEIGHT, Math.max(MIN_WIDGET_HEIGHT, Math.floor(height)));
  }
  return result;
}

export interface NativeWidgetOptions {
  html: string;
  width?: number;
  height?: number;
  publicData?: string;
  chatData?: string;
  caption?: string;
  parseMode?: string;
  showCaptionAboveMedia?: boolean;
  allowQueries?: boolean;
  isShared?: boolean;
  disableNotification?: boolean;
  protectContent?: boolean;
  messageEffectId?: string;
}

export interface SendWidgetPayload {
  html: string;
  width?: number;
  height?: number;
  public_data?: string;
  chat_data?: string;
  caption?: string;
  parse_mode?: string;
  show_caption_above_media?: boolean;
  allow_queries?: boolean;
  is_shared?: boolean;
  disable_notification?: boolean;
  protect_content?: boolean;
  message_effect_id?: string;
}

/**
 * Validates and prepares sendWidget payload parameters.
 */
export function createWidgetPayload(options: NativeWidgetOptions): SendWidgetPayload {
  validateWidgetHtml(options.html);
  validateWidgetData(options.publicData, 'public_data');
  validateWidgetData(options.chatData, 'chat_data');

  const { width, height } = clampWidgetDimensions(options.width, options.height);

  return {
    html: options.html,
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...(options.publicData !== undefined ? { public_data: options.publicData } : {}),
    ...(options.chatData !== undefined ? { chat_data: options.chatData } : {}),
    ...(options.caption !== undefined ? { caption: options.caption } : {}),
    ...(options.parseMode !== undefined ? { parse_mode: options.parseMode } : {}),
    ...(options.showCaptionAboveMedia !== undefined
      ? { show_caption_above_media: options.showCaptionAboveMedia }
      : {}),
    ...(options.allowQueries !== undefined ? { allow_queries: options.allowQueries } : {}),
    ...(options.isShared !== undefined ? { is_shared: options.isShared } : {}),
    ...(options.disableNotification !== undefined
      ? { disable_notification: options.disableNotification }
      : {}),
    ...(options.protectContent !== undefined ? { protect_content: options.protectContent } : {}),
    ...(options.messageEffectId !== undefined ? { message_effect_id: options.messageEffectId } : {}),
  };
}

/**
 * Signs widget state using HMAC-SHA256 to ensure authenticity across queries.
 */
export function signWidgetState(state: Record<string, unknown>, botToken: string): string {
  const serialized = JSON.stringify(state, Object.keys(state).sort());
  return computeInitDataHash(`state=${encodeURIComponent(serialized)}`, botToken);
}

/**
 * Verifies widget signed state and parses the payload.
 */
export function verifyWidgetState<T extends Record<string, unknown>>(
  state: T,
  signature: string,
  botToken: string,
): boolean {
  const expected = signWidgetState(state, botToken);
  return expected === signature;
}
