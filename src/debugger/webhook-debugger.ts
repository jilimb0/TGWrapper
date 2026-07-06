import type { Update } from '../types/telegram.js';

export interface CapturedWebhook {
  id: string;
  timestamp: string;
  update: Update;
  headers?: Record<string, string | undefined>;
  session?: Record<string, unknown>;
}

export interface WebhookDebuggerOptions {
  /** Maximum number of captured webhooks to keep in the ring buffer. Default: 100 */
  maxEntries?: number;
  /** Whether the debugger is enabled. Default: false */
  enabled?: boolean;
}

const DEFAULT_MAX_ENTRIES = 100;

/**
 * Opt-in webhook debugger for development.
 * Captures incoming webhook payloads in a configurable ring buffer
 * and serves an HTML inspection page.
 *
 * Disabled by default — all methods are no-ops when `enabled: false`.
 */
export class WebhookDebugger {
  private readonly maxEntries: number;
  private readonly enabled: boolean;
  private readonly buffer: CapturedWebhook[] = [];
  private nextId = 1;

  public constructor(options: WebhookDebuggerOptions = {}) {
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.enabled = options.enabled ?? false;
  }

  /**
   * Capture a webhook payload into the ring buffer.
   * No-op when debugger is disabled.
   */
  public capture(
    update: Update,
    headers?: Record<string, string | undefined>,
    session?: Record<string, unknown>,
  ): void {
    if (!this.enabled) return;

    const entry: CapturedWebhook = {
      id: String(this.nextId++),
      timestamp: new Date().toISOString(),
      update,
    };
    if (headers) entry.headers = headers;
    if (session) entry.session = session;

    if (this.buffer.length >= this.maxEntries) {
      this.buffer.shift();
    }
    this.buffer.push(entry);
  }

  /**
   * Return all captured webhooks (newest first).
   */
  public getEntries(): readonly CapturedWebhook[] {
    if (!this.enabled) return [];
    return [...this.buffer].reverse();
  }

  /**
   * Clear the captured buffer.
   */
  public clear(): void {
    this.buffer.length = 0;
  }

  /**
   * Get the count of captured entries.
   */
  public get size(): number {
    return this.enabled ? this.buffer.length : 0;
  }

  /**
   * Render an HTML inspection page showing captured webhooks.
   */
  public renderPage(): string {
    const entries = this.getEntries();

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TGWrapper Webhook Debugger</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #c9d1d9; }
  header { background: #161b22; border-bottom: 1px solid #30363d; padding: 16px 24px; display: flex; align-items: center; gap: 16px; }
  header h1 { font-size: 18px; font-weight: 600; }
  header .badge { background: #238636; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
  header .clear-btn { margin-left: auto; background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; }
  header .clear-btn:hover { background: #30363d; }
  .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
  .empty { text-align: center; padding: 48px; color: #8b949e; }
  .empty code { background: #161b22; padding: 2px 6px; border-radius: 4px; }
  .entry { background: #161b22; border: 1px solid #30363d; border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
  .entry-header { padding: 12px 16px; background: #1c2128; border-bottom: 1px solid #30363d; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .entry-id { font-weight: 600; color: #58a6ff; font-size: 13px; }
  .entry-time { color: #8b949e; font-size: 12px; }
  .entry-type { background: #1f6feb; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase; }
  .entry-detail { display: none; }
  .entry-detail.open { display: block; }
  pre { padding: 16px; overflow-x: auto; font-size: 13px; line-height: 1.5; background: #0d1117; margin: 0; }
  pre .key { color: #79c0ff; }
  pre .string { color: #a5d6ff; }
  pre .number { color: #79c0ff; }
  pre .bool { color: #d2a8ff; }
  pre .null { color: #8b949e; }
  .toggle-btn { background: none; border: 1px solid #30363d; color: #c9d1d9; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-left: auto; }
  .toggle-btn:hover { background: #30363d; }
  .session-badge { background: #d29922; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
</style>
</head>
<body>
<header>
  <h1>TGWrapper Webhook Debugger</h1>
  <span class="badge">${entries.length} captured</span>
  <button class="clear-btn" onclick="fetch('/__debug/clear',{method:'POST'}).then(()=>location.reload())">Clear</button>
</header>
<div class="container">
  ${entries.length === 0
    ? `<div class="empty"><p>No webhooks captured yet.</p><p>Send requests to your webhook endpoint and they will appear here.</p><p>Set <code>debugger.enabled = true</code> on your WebhookDebugger to start capturing.</p></div>`
    : entries.map((entry) => this.renderEntry(entry)).join('\n')}
</div>
<script>
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const detail = btn.parentElement.nextElementSibling;
      detail.classList.toggle('open');
      btn.textContent = detail.classList.contains('open') ? 'Collapse' : 'Expand';
    });
  });
  // Auto-refresh every 3 seconds if there are new entries
  let lastCount = ${entries.length};
  setInterval(async () => {
    const res = await fetch('/__debug/count');
    const count = parseInt(await res.text(), 10);
    if (count !== lastCount) location.reload();
  }, 3000);
</script>
</body>
</html>`;
  }

  private renderEntry(entry: CapturedWebhook): string {
    const updateType = this.detectUpdateType(entry.update);
    const formatted = JSON.stringify(entry.update, null, 2);
    const hasSession = !!entry.session;

    return `<div class="entry">
  <div class="entry-header">
    <span class="entry-id">#${entry.id}</span>
    <span class="entry-time">${entry.timestamp}</span>
    <span class="entry-type">${escapeHtml(updateType)}</span>
    ${hasSession ? '<span class="session-badge">session</span>' : ''}
    <button class="toggle-btn">Expand</button>
  </div>
  <div class="entry-detail">
    ${entry.headers ? `<pre>${this.renderHeaders(entry.headers)}</pre>` : ''}
    ${hasSession ? `<pre>// Session state\n${JSON.stringify(entry.session, null, 2)}</pre>` : ''}
    <pre><code>${escapeHtml(formatted)}</code></pre>
  </div>
</div>`;
  }

  private renderHeaders(headers: Record<string, string | undefined>): string {
    const lines = Object.entries(headers)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    return `// Headers\n${lines}\n\n`;
  }

  private detectUpdateType(update: Update): string {
    for (const key of Object.keys(update)) {
      if (key === 'update_id') continue;
      return key;
    }
    return 'unknown';
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
