export type {
  ParsedInitData,
  TelegramChat,
  TelegramUser,
  TmaErrorCode,
  TmaValidationResult,
  ValidateInitDataOptions,
} from './types.js';

export {
  computeInitDataHash,
  parseAndValidateInitData,
  parseInitData,
  validateInitData,
} from './validate-init-data.js';

export type {
  ExpressLikeNextFunction,
  ExpressLikeRequest,
  ExpressLikeResponse,
  TmaExpressMiddlewareOptions,
} from './middleware/express.js';
export {
  extractInitDataFromHeaders,
  tmaExpressMiddleware,
} from './middleware/express.js';

export type {
  NextJsTmaAuthResult,
  NextJsTmaOptions,
} from './middleware/nextjs.js';
export { validateNextJsTmaRequest } from './middleware/nextjs.js';

export type {
  HonoLikeContext,
  HonoLikeNext,
  TmaHonoMiddlewareOptions,
} from './middleware/hono.js';
export { tmaHonoMiddleware } from './middleware/hono.js';

export type { TmaSessionBridgeOptions } from './session-bridge.js';
export { TmaSessionBridge } from './session-bridge.js';

export type {
  HtmlBubbleOptions,
  HtmlBubblePayload,
} from './bubbles.js';
export {
  HtmlBubbleSecurityError,
  HtmlBubbleSizeLimitError,
  MAX_HTML_BUBBLE_SIZE_BYTES,
  createHtmlBubblePayload,
  signBubbleState,
  validateBubbleSandboxSafety,
  verifyBubbleState,
} from './bubbles.js';

export type {
  NativeWidgetOptions,
  SendWidgetPayload,
  WidgetValidationResult,
} from './widgets.js';
export {
  MAX_WIDGET_COMPRESSED_BYTES,
  MAX_WIDGET_DATA_BYTES,
  MAX_WIDGET_HTML_BYTES,
  MAX_WIDGET_HEIGHT,
  MIN_WIDGET_HEIGHT,
  MIN_WIDGET_WIDTH,
  WidgetSizeLimitError,
  clampWidgetDimensions,
  createWidgetPayload,
  signWidgetState,
  validateWidgetData,
  validateWidgetHtml,
  verifyWidgetState,
} from './widgets.js';
