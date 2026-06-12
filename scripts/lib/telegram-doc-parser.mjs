function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

const METHOD_NAME_RE = /^[a-z][A-Za-z0-9_]{2,}$/;
const UPDATE_KEY_RE = /^[a-z][a-z0-9_]{2,}$/;
const OBJECT_NAME_RE = /^[A-Z][A-Za-z0-9]+$/;

const METHOD_BLOCKLIST = new Set([
  'true',
  'false',
  'utf',
  'http',
  'https',
  'json',
  'html',
  'parsemode'
]);

const METHOD_COMMON_WORD_BLOCKLIST = new Set([
  'methods',
  'method',
  'objects',
  'object',
  'updates',
  'update',
  'games',
  'stickers',
  'payments',
  'passport',
  'options',
  'formatting',
  'introduction',
  'available'
]);

const METHOD_PREFIXES = [
  'get',
  'set',
  'send',
  'delete',
  'edit',
  'answer',
  'create',
  'copy',
  'forward',
  'approve',
  'decline',
  'ban',
  'unban',
  'pin',
  'unpin',
  'promote',
  'restrict',
  'save',
  'refund',
  'remove',
  'reopen',
  'revoke',
  'upload',
  'verify',
  'transfer',
  'post',
  'read',
  'leave',
  'log',
  'hide',
  'unhide',
  'gift',
  'convert',
  'replace',
  'stop',
  'export',
  'close'
];

function decodeEntities(input) {
  const entities = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'"
  };
  return input.replace(/&(lt|gt|amp|quot|#39);/g, (match) => entities[`&${match.slice(1)}`] ?? match);
}

function stripTags(input) {
  return decodeEntities(input).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function getFirstStructuredBlockAfterOffset(html, offset) {
  if (offset < 0) return '';
  const tail = html.slice(offset);
  const tableStart = tail.search(/<table[^>]*>/i);
  const dlStart = tail.search(/<dl[^>]*>/i);

  if (tableStart === -1 && dlStart === -1) return '';

  const useTable = tableStart !== -1 && (dlStart === -1 || tableStart < dlStart);
  if (useTable) {
    const tableTail = tail.slice(tableStart);
    const tableEnd = tableTail.search(/<\/table>/i);
    if (tableEnd === -1) return '';
    return tableTail.slice(0, tableEnd + '</table>'.length);
  }

  const dlTail = tail.slice(dlStart);
  const dlEnd = dlTail.search(/<\/dl>/i);
  if (dlEnd === -1) return '';
  return dlTail.slice(0, dlEnd + '</dl>'.length);
}

function findSectionByHeading(html, headingText) {
  const headings = [...html.matchAll(/<h([1-6])[^>]*>[\s\S]*?<\/h\1>/gi)];
  for (let i = 0; i < headings.length; i += 1) {
    const level = Number(headings[i][1]);
    const text = stripTags(headings[i][0]).toLowerCase();
    if (text !== headingText.toLowerCase()) continue;
    const start = headings[i].index ?? 0;
    let end = html.length;
    for (let j = i + 1; j < headings.length; j += 1) {
      const nextLevel = Number(headings[j][1]);
      if (nextLevel <= level) {
        end = headings[j].index ?? html.length;
        break;
      }
    }
    return html.slice(start, end);
  }
  return '';
}

function normalizeMethodCandidate(value) {
  const candidate = value.trim();
  if (!METHOD_NAME_RE.test(candidate)) {
    return null;
  }
  if (METHOD_BLOCKLIST.has(candidate.toLowerCase())) {
    return null;
  }
  return candidate;
}

function isLikelyMethodName(candidate) {
  if (!METHOD_NAME_RE.test(candidate)) return false;
  const lower = candidate.toLowerCase();
  if (METHOD_BLOCKLIST.has(lower) || METHOD_COMMON_WORD_BLOCKLIST.has(lower)) return false;

  const hasSupportedPrefix = METHOD_PREFIXES.some((prefix) => lower.startsWith(prefix));
  if (!hasSupportedPrefix) return false;

  const hasUppercase = /[A-Z]/.test(candidate);
  const allowLowercaseSingleton = candidate === 'close';
  if (!hasUppercase && !allowLowercaseSingleton) return false;

  return true;
}

function parseHtmlTable(block) {
  const rows = [...block.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((rowMatch) => {
    const cells = [...rowMatch[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cellMatch) =>
      normalizeWhitespace(stripTags(cellMatch[1]))
    );
    return cells;
  });
  return rows.filter((row) => row.length > 0);
}

function parseParamTable(block) {
  const rows = parseHtmlTable(block);
  if (rows.length <= 1) return [];
  const header = rows[0].map((cell) => cell.toLowerCase());
  const nameIndex = header.findIndex((cell) => cell === 'parameter' || cell === 'field');
  const typeIndex = header.findIndex((cell) => cell === 'type');
  const requiredIndex = header.findIndex((cell) => cell === 'required');
  const descIndex = header.findIndex((cell) => cell.startsWith('description'));
  if (nameIndex === -1 || typeIndex === -1) return [];

  return rows.slice(1).map((row) => ({
    name: row[nameIndex] ?? '',
    type: row[typeIndex] ?? 'unknown',
    required: requiredIndex === -1 ? null : /^yes$/i.test(row[requiredIndex] ?? ''),
    description: descIndex === -1 ? '' : row[descIndex] ?? ''
  })).filter((row) => row.name);
}

function parseReturnsFromSection(sectionHtml) {
  const text = normalizeWhitespace(stripTags(sectionHtml));
  const successMatch = text.match(/On success,\s+(.+?)\s+is returned\./i);
  if (successMatch) {
    return successMatch[1];
  }
  const genericMatch = text.match(/returns?\s+(?:an?\s+)?(.+?)(?:\.|\s{2,}|Use this method)/i);
  return genericMatch ? genericMatch[1] : null;
}

function sectionBlocksByHeading(html, minLevel = 3) {
  const headings = [...html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)];
  const blocks = [];
  for (let i = 0; i < headings.length; i += 1) {
    const level = Number(headings[i][1]);
    if (level < minLevel) continue;
    const title = normalizeWhitespace(stripTags(headings[i][2]));
    const start = headings[i].index ?? 0;
    let end = html.length;
    for (let j = i + 1; j < headings.length; j += 1) {
      const nextLevel = Number(headings[j][1]);
      if (nextLevel <= level) {
        end = headings[j].index ?? html.length;
        break;
      }
    }
    blocks.push({ level, title, html: html.slice(start, end) });
  }
  return blocks;
}

export function parseDocForMethods(html) {
  const candidates = [];

  for (const match of html.matchAll(/\/bot(?:<|&lt;)token(?:>|&gt;)\/([A-Za-z0-9_]+)/g)) {
    candidates.push(match[1]);
  }

  for (const match of html.matchAll(/<h([3-6])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const rawHeading = stripTags(match[2]);
    const token = rawHeading.split(/\s+/)[0];
    if (!isLikelyMethodName(token)) {
      continue;
    }
    candidates.push(token);
  }

  return uniqueSorted(candidates.map(normalizeMethodCandidate).filter(Boolean));
}

export function parseDocForStructuredMethods(html) {
  const sections = sectionBlocksByHeading(html, 3);
  const methods = [];

  for (const section of sections) {
    const token = section.title.split(/\s+/)[0];
    if (!isLikelyMethodName(token)) continue;
    const block = getFirstStructuredBlockAfterOffset(section.html, 0);
    const params = block ? parseParamTable(block) : [];
    const returns = parseReturnsFromSection(section.html);
    methods.push({
      name: token,
      params,
      returns,
      summary: normalizeWhitespace(stripTags(section.html)).slice(0, 500)
    });
  }

  const byName = new Map();
  for (const method of methods) {
    if (!byName.has(method.name)) {
      byName.set(method.name, method);
    }
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function parseDocForObjects(html) {
  const objectsSection = findSectionByHeading(html, 'available types');
  const sections = sectionBlocksByHeading(objectsSection || html, 3);
  const objects = [];

  for (const section of sections) {
    const token = section.title.split(/\s+/)[0];
    if (!OBJECT_NAME_RE.test(token)) continue;
    if (/^(Available|Getting)$/i.test(token)) continue;
    const block = getFirstStructuredBlockAfterOffset(section.html, 0);
    const fields = block ? parseParamTable(block) : [];
    if (fields.length === 0) continue;
    objects.push({
      name: token,
      fields,
      summary: normalizeWhitespace(stripTags(section.html)).slice(0, 500)
    });
  }

  const byName = new Map();
  for (const object of objects) {
    if (!byName.has(object.name)) {
      byName.set(object.name, object);
    }
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function parseDocForUpdateKeys(html) {
  const candidates = [];
  let updateTable = '';

  const headingMatches = [...html.matchAll(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi)];
  for (const match of headingMatches) {
    const headingText = stripTags(match[0]).toLowerCase();
    if (headingText !== 'update') continue;
    updateTable = getFirstStructuredBlockAfterOffset(html, match.index ?? 0);
    if (updateTable) break;
  }

  if (!updateTable) {
    const anchorIndex = html.search(/(?:name|id)=['"]update['"]/i);
    if (anchorIndex !== -1) {
      updateTable = getFirstStructuredBlockAfterOffset(html, anchorIndex);
    }
  }

  if (/^\s*<dl[\s>]/i.test(updateTable)) {
    for (const match of updateTable.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>/gi)) {
      const raw = stripTags(match[1]);
      const key = raw.split(/\s+/)[0].trim();
      if (!UPDATE_KEY_RE.test(key)) continue;
      if (key === 'update_id') continue;
      candidates.push(key);
    }
    return uniqueSorted(candidates);
  }

  for (const match of updateTable.matchAll(/<tr[^>]*>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/gi)) {
    const raw = stripTags(match[1]);
    const key = raw.split(/\s+/)[0].trim();
    if (!UPDATE_KEY_RE.test(key)) continue;
    if (key === 'update_id') continue;
    candidates.push(key);
  }

  return uniqueSorted(candidates);
}
