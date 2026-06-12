import { describe, expect, it } from 'vitest';
import {
  parseDocForMethods,
  parseDocForObjects,
  parseDocForStructuredMethods,
  parseDocForUpdateKeys
} from '../../scripts/lib/telegram-doc-parser.mjs';

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
      <h3>Available methods</h3>
      <h4>sendMessage</h4>
      <h4>editMessageText</h4>
      <h3>Available types</h3>
      <h4>Message</h4>
      <h4>Chat</h4>
      <p>Use endpoint /bot&lt;token&gt;/sendMessage</p>
    `;
    const methods = parseDocForMethods(html);
    expect(methods).toContain('sendMessage');
    expect(methods).toContain('editMessageText');
    expect(methods).not.toContain('Message');
    expect(methods).not.toContain('Chat');
  });

  it('extracts methods from getting-updates section headings with method context', () => {
    const html = `
      <h3>Getting updates</h3>
      <h4>getUpdates</h4>
      <p>Use this method to receive incoming updates.</p>
      <h4>setWebhook</h4>
      <p>Use this method to specify a URL and receive incoming updates via webhook.</p>
      <h4>Update</h4>
      <p>This object represents an incoming update.</p>
    `;
    const methods = parseDocForMethods(html);
    expect(methods).toContain('getUpdates');
    expect(methods).toContain('setWebhook');
    expect(methods).not.toContain('Update');
  });

  it('parses structured methods with params and returns', () => {
    const html = `
      <h4>sendMessage</h4>
      <p>Use this method to send text messages. On success, the sent Message is returned.</p>
      <table>
        <tr><th>Parameter</th><th>Type</th><th>Required</th><th>Description</th></tr>
        <tr><td><code>chat_id</code></td><td>Integer or String</td><td>Yes</td><td>Unique identifier.</td></tr>
        <tr><td><code>text</code></td><td>String</td><td>Yes</td><td>Text of the message.</td></tr>
      </table>
    `;

    const methods = parseDocForStructuredMethods(html);
    expect(methods).toHaveLength(1);
    expect(methods[0].name).toBe('sendMessage');
    expect(methods[0].params[0]).toMatchObject({ name: 'chat_id', type: 'Integer or String', required: true });
    expect(methods[0].params[1]).toMatchObject({ name: 'text', type: 'String', required: true });
    expect(methods[0].returns).toContain('sent Message');
  });

  it('parses objects from available types section', () => {
    const html = `
      <h3>Available types</h3>
      <h4>Message</h4>
      <p>This object represents a message.</p>
      <table>
        <tr><th>Field</th><th>Type</th><th>Description</th></tr>
        <tr><td><code>message_id</code></td><td>Integer</td><td>Unique message identifier.</td></tr>
        <tr><td><code>date</code></td><td>Integer</td><td>Date the message was sent.</td></tr>
      </table>
      <h4>Chat</h4>
      <p>This object represents a chat.</p>
      <table>
        <tr><th>Field</th><th>Type</th><th>Description</th></tr>
        <tr><td><code>id</code></td><td>Integer</td><td>Unique identifier.</td></tr>
      </table>
    `;

    const objects = parseDocForObjects(html);
    expect(objects.map((x) => x.name)).toEqual(['Chat', 'Message']);
    expect(objects.find((x) => x.name === 'Message')?.fields[0]).toMatchObject({ name: 'message_id', type: 'Integer' });
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
