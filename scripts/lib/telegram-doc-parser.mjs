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

  for (const match of html.matchAll(/<h4[^>]*>\s*([\s\S]*?)\s*<\/h4>/gim)) {
    const text = match[1].replace(/<[^>]*>/g, ' ').trim();
    for (const token of text.split(/\s+/g)) {
      const normalized = normalizeMethodCandidate(token);
      if (normalized) {
        candidates.push(normalized);
      }
    }
  }

  return uniqueSorted(candidates.map(normalizeMethodCandidate).filter(Boolean));
}

export function parseDocForUpdateKeys(html) {
  const candidates = [];
  const sectionByAnchor =
    html.match(/(?:name|id)="update"[\s\S]*?(?:name|id)="webhook(?:info|setup)"/i)?.[0] ?? '';

  let sectionByHeading = '';
  const headingMatches = [...html.matchAll(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi)];
  for (const match of headingMatches) {
    const headingHtml = match[0];
    const headingText = headingHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    if (headingText !== 'update') {
      continue;
    }
    const fromHeading = html.slice(match.index ?? 0);
    const tableStart = fromHeading.search(/<table[^>]*>/i);
    if (tableStart === -1) {
      continue;
    }
    const tableSlice = fromHeading.slice(tableStart);
    const tableEnd = tableSlice.search(/<\/table>/i);
    if (tableEnd === -1) {
      continue;
    }
    sectionByHeading = tableSlice.slice(0, tableEnd + '</table>'.length);
    break;
  }

  const source = `${sectionByAnchor}\n${sectionByHeading}`.trim() || html;

  for (const match of source.matchAll(/<td>\s*<(?:em|code)>([a-z_]+)<\/(?:em|code)>\s*<\/td>/gi)) {
    candidates.push(match[1]);
  }

  for (const match of source.matchAll(/(?:^|[\s>])([a-z_][a-z0-9_]*)\??:\s/gi)) {
    candidates.push(match[1]);
  }

  return uniqueSorted(candidates.filter((k) => UPDATE_KEY_RE.test(k) && k !== 'update_id'));
}
