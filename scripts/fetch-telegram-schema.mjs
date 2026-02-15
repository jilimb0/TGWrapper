import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseDocForMethods, parseDocForUpdateKeys } from './lib/telegram-doc-parser.mjs';

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

function parseLocalTypes() {
  const src = readFileSync(resolve(process.cwd(), 'src/types/telegram.ts'), 'utf8');
  const generatedPath = resolve(process.cwd(), 'src/types/telegram.schema.generated.ts');
  const generatedSrc = existsSync(generatedPath) ? readFileSync(generatedPath, 'utf8') : '';
  const apiMethodsBlock = src.match(/export type ApiMethods<[\s\S]*?\{([\s\S]*?)\n\};/);

  const generatedUpdateKeys = [
    ...generatedSrc.matchAll(/export type TelegramUpdateKey =([\s\S]*?);/g)
  ].flatMap((match) => [...match[1].matchAll(/\|\s*'([a-z_][a-z0-9_]*)'/g)].map((item) => item[1]));

  const generatedMethods = [
    ...generatedSrc.matchAll(/export type TelegramApiMethodName =([\s\S]*?);/g)
  ].flatMap((match) => [...match[1].matchAll(/\|\s*'([A-Za-z][A-Za-z0-9_]*)'/g)].map((item) => item[1]));

  const methods = apiMethodsBlock
    ? uniqueSorted([...apiMethodsBlock[1].matchAll(/^\s*([A-Za-z][A-Za-z0-9_]*)\s*:/gm)].map((match) => match[1]))
    : [];

  const updateBlock = extractBlockByHeader(src, 'export interface Update');
  const fallbackUpdateKeys = updateBlock ? extractTopLevelOptionalKeys(updateBlock) : [];

  return {
    source: 'local-types',
    source_url: null,
    methods: uniqueSorted([...generatedMethods, ...methods]),
    update_keys: uniqueSorted([...generatedUpdateKeys, ...fallbackUpdateKeys])
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

  if (methods.length === 0 || updateKeys.length === 0) {
    throw new Error(`Invalid parsed schema from Telegram API page (methods=${methods.length}, update_keys=${updateKeys.length})`);
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
