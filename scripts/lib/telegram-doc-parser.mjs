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

function decodeEntities(input) {
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
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

export function parseDocForMethods(html) {
  const candidates = [];

  for (const match of html.matchAll(/\/bot(?:<|&lt;)token(?:>|&gt;)\/([A-Za-z0-9_]+)/g)) {
    candidates.push(match[1]);
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
