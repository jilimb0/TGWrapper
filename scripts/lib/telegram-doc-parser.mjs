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

const UPDATE_BLOCKLIST = new Set([
  'optional',
  'required',
  'integer',
  'string',
  'boolean',
  'array',
  'object',
  'true',
  'false',
  'update',
  'webhookinfo',
  'webhooksetup',
  'messageid',
  'chatid',
  'userid'
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
  let source = '';

  const anchorIndex =
    html.search(/(?:name|id)=["']update["']/i) >= 0
      ? html.search(/(?:name|id)=["']update["']/i)
      : html.search(/href=["']#update["']/i);
  if (anchorIndex >= 0) {
    const tail = html.slice(anchorIndex);
    const end =
      tail.search(/(?:name|id)=["']webhook(?:info|setup)["']/i) >= 0
        ? tail.search(/(?:name|id)=["']webhook(?:info|setup)["']/i)
        : tail.search(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/i);
    source = end > 0 ? tail.slice(0, end) : tail.slice(0, 120000);
  }

  if (!source) {
    const headingMatches = [...html.matchAll(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi)];
    for (const match of headingMatches) {
      const headingText = stripTags(match[0]).toLowerCase();
      if (!headingText.includes('update')) {
        continue;
      }
      const fromHeading = html.slice(match.index ?? 0);
      const nextHeading = fromHeading.search(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/i);
      source = nextHeading > 0 ? fromHeading.slice(0, nextHeading) : fromHeading.slice(0, 120000);
      break;
    }
  }

  source ||= html;

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

  for (const match of source.matchAll(/(?:^|[\s>])([a-z_][a-z0-9_]*)\??:\s/gi)) {
    candidates.push(match[1]);
  }

  for (const match of stripTags(source).matchAll(/\b([a-z_][a-z0-9_]*)\b\s+(?:Optional|Required)\b/gi)) {
    candidates.push(match[1]);
  }

  return uniqueSorted(
    candidates.filter((k) => UPDATE_KEY_RE.test(k) && k !== 'update_id' && !UPDATE_BLOCKLIST.has(k.toLowerCase()))
  );
}
