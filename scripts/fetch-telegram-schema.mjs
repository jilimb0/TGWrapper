import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const API_DOC_URL = 'https://core.telegram.org/bots/api';

const args = new Set(process.argv.slice(2));
const outArg = process.argv.find((arg) => arg.startsWith('--out='));
const outPath = resolve(process.cwd(), outArg ? outArg.slice('--out='.length) : 'docs/telegram-api-schema.latest.json');
const fromLocal = args.has('--from-local');
const allowNetworkFailure = args.has('--allow-network-failure');

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function extractBlockByHeader(source, header) {
  const start = source.indexOf(header);
  if (start === -1) {
    return '';
  }
  const openBrace = source.indexOf('{', start);
  if (openBrace === -1) {
    return '';
  }

  let depth = 0;
  for (let i = openBrace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') depth -= 1;
    if (depth === 0) {
      return source.slice(openBrace + 1, i);
    }
  }
  return '';
}

function extractTopLevelOptionalKeys(block) {
  return uniqueSorted(
    [...block.matchAll(/^ {2}([a-z_][a-z0-9_]*)\??:\s*/gim)]
      .map((match) => match[1])
      .filter((key) => key !== 'update_id')
  );
}

function parseDocForMethods(html) {
  const methods = [...html.matchAll(/\/bot<token>\/([A-Za-z0-9_]+)/g)].map((match) => match[1]);
  return uniqueSorted(methods);
}

function parseDocForUpdateKeys(html) {
  const sectionMatch = html.match(/name="update"[\s\S]*?(name="webhookinfo"|name="webhooksetup")/i);
  if (!sectionMatch) {
    return [];
  }

  const section = sectionMatch[0];
  const rowMatches = [...section.matchAll(/<td>\s*<em>([a-z_]+)<\/em>\s*<\/td>/gi)];
  return uniqueSorted(rowMatches.map((match) => match[1]).filter((key) => key !== 'update_id'));
}

function parseLocalTypes() {
  const src = readFileSync(resolve(process.cwd(), 'src/types/telegram.ts'), 'utf8');
  const updateBlock = extractBlockByHeader(src, 'export interface Update');
  const apiMethodsBlock = src.match(/export type ApiMethods<[\s\S]*?\{([\s\S]*?)\n\};/);

  const updateKeys = updateBlock ? extractTopLevelOptionalKeys(updateBlock) : [];

  const methods = apiMethodsBlock
    ? uniqueSorted([...apiMethodsBlock[1].matchAll(/^\s*([A-Za-z][A-Za-z0-9_]*)\s*:/gm)].map((match) => match[1]))
    : [];

  return {
    source: 'local-types',
    source_url: null,
    methods,
    update_keys: updateKeys
  };
}

async function parseRemoteTypes() {
  const response = await fetch(API_DOC_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${API_DOC_URL}: HTTP ${response.status}`);
  }

  const html = await response.text();
  const methods = parseDocForMethods(html);
  const updateKeys = parseDocForUpdateKeys(html);

  if (methods.length === 0) {
    throw new Error('No API methods parsed from Telegram API page');
  }

  return {
    source: 'telegram-api-doc',
    source_url: API_DOC_URL,
    methods,
    update_keys: updateKeys
  };
}

async function main() {
  let parsed;
  if (fromLocal) {
    parsed = parseLocalTypes();
  } else {
    try {
      parsed = await parseRemoteTypes();
    } catch (error) {
      if (!allowNetworkFailure) {
        throw error;
      }
      parsed = parseLocalTypes();
      parsed.warning = error instanceof Error ? error.message : 'network failure';
    }
  }

  const output = {
    fetched_at: new Date().toISOString(),
    ...parsed
  };

  writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8');

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        out: outPath,
        source: output.source,
        methods: output.methods.length,
        update_keys: output.update_keys.length,
        warning: output.warning ?? null
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
