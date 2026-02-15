import { describe, expect, it } from 'vitest';
import { parseDocForMethods, parseDocForUpdateKeys } from '../../scripts/lib/telegram-doc-parser.mjs';

describe('telegram doc parser', () => {
  it('parses method names from endpoint examples and headers', () => {
    const html = `
      <h4><a href="#sendmessage">sendMessage</a></h4>
      <p>Use endpoint /bot&lt;token&gt;/sendMessage</p>
      <p>Use endpoint /bot&lt;token&gt;/editMessageText</p>
      <h4><code>answerCallbackQuery</code></h4>
      <p>Use endpoint /bot&lt;token&gt;/answerCallbackQuery</p>
      <h4><i>getUpdates</i></h4>
      <p>Use endpoint /bot&lt;token&gt;/getUpdates</p>
    `;

    const methods = parseDocForMethods(html);

    expect(methods).toContain('sendMessage');
    expect(methods).toContain('editMessageText');
    expect(methods).toContain('answerCallbackQuery');
    expect(methods).toContain('getUpdates');
  });

  it('does not include random heading words as methods', () => {
    const html = `
      <h4>Methods and objects</h4>
      <h4>When to use</h4>
      <p>Use endpoint /bot&lt;token&gt;/sendMessage</p>
    `;
    const methods = parseDocForMethods(html);
    expect(methods).toContain('sendMessage');
    expect(methods).not.toContain('methods');
    expect(methods).not.toContain('objects');
    expect(methods).not.toContain('when');
  });

  it('parses update keys from update section table markup', () => {
    const html = `
      <a name="update"></a>
      <table>
        <tr><td><em>message</em></td><td>Optional</td></tr>
        <tr><td><code>callback_query</code></td><td>Optional</td></tr>
        <tr><td><em>chat_boost</em></td><td>Optional</td></tr>
      </table>
      <a name="webhookinfo"></a>
    `;

    const keys = parseDocForUpdateKeys(html);

    expect(keys).toContain('message');
    expect(keys).toContain('callback_query');
    expect(keys).toContain('chat_boost');
  });

  it('parses update keys from heading+table layout without update anchors', () => {
    const html = `
      <h4>Update</h4>
      <table>
        <tr><td><em>message</em></td><td>Optional</td></tr>
        <tr><td><em>edited_message</em></td><td>Optional</td></tr>
        <tr><td><code>chat_member</code></td><td>Optional</td></tr>
      </table>
      <h4>WebhookInfo</h4>
    `;

    const keys = parseDocForUpdateKeys(html);

    expect(keys).toContain('message');
    expect(keys).toContain('edited_message');
    expect(keys).toContain('chat_member');
  });

  it('parses update keys from definition list layout', () => {
    const html = `
      <a id="update"></a>
      <dl>
        <dt><code>message</code></dt><dd>Optional. New message.</dd>
        <dt><code>callback_query</code></dt><dd>Optional. Callback query.</dd>
      </dl>
      <a id="webhookinfo"></a>
    `;
    const keys = parseDocForUpdateKeys(html);
    expect(keys).toContain('message');
    expect(keys).toContain('callback_query');
  });

  it('does not parse update keys from unrelated parameter tables', () => {
    const html = `
      <h4>sendMessage</h4>
      <table>
        <tr><td><em>chat_id</em></td><td>Required</td></tr>
        <tr><td><em>text</em></td><td>Required</td></tr>
      </table>
      <h4>Update</h4>
      <table>
        <tr><td><em>message</em></td><td>Optional</td></tr>
        <tr><td><em>callback_query</em></td><td>Optional</td></tr>
      </table>
    `;
    const keys = parseDocForUpdateKeys(html);
    expect(keys).toEqual(['callback_query', 'message']);
  });
});
