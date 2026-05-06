function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

const METHOD_NAME_RE = /^[a-z][A-Za-z0-9_]{2,}$/;
const UPDATE_KEY_RE = /^[a-z][a-z0-9_]{2,}$/;

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

function getFirstTableAfterOffset(html, offset) {
  if (offset < 0) return '';
  const tail = html.slice(offset);
  const tableStart = tail.search(/<table[^>]*>/i);
  if (tableStart === -1) return '';
  const tableTail = tail.slice(tableStart);
  const tableEnd = tableTail.search(/<\/table>/i);
  if (tableEnd === -1) return '';
  return tableTail.slice(0, tableEnd + '</table>'.length);
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
    const anchorIndex = html.search(/(?:name|id)=["']update["']/i);
    if (anchorIndex >= 0) {
      updateTable = getFirstStructuredBlockAfterOffset(html, anchorIndex);
    }
  }

  const source = updateTable;
  if (!source) {
    return [];
  }

  for (const row of source.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const firstCell = row[1].match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    if (!firstCell) {
      continue;
    }
    const token = stripTags(firstCell[1]).match(/\b([a-z_][a-z0-9_]*)\b/);
    if (token) {
      candidates.push(token[1]);
    }
  }

  for (const match of source.matchAll(/<dt[^>]*>[\s\S]*?<code[^>]*>([a-z_][a-z0-9_]*)<\/code>[\s\S]*?<\/dt>/gi)) {
    candidates.push(match[1]);
  }

  return uniqueSorted(candidates.filter((k) => UPDATE_KEY_RE.test(k) && k !== 'update_id'));
}
