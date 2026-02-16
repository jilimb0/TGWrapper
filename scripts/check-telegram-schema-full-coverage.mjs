import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function parseUnionMembers(ts, typeName) {
  const marker = `export type ${typeName} =`;
  const start = ts.indexOf(marker);
  if (start === -1) return [];
  const tail = ts.slice(start + marker.length);
  const end = tail.indexOf(';');
  if (end === -1) return [];
  const body = tail.slice(0, end);
  return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

function parseMapKeys(ts, typeName) {
  const marker = `export type ${typeName} = {`;
  const start = ts.indexOf(marker);
  if (start === -1) return [];
  const tail = ts.slice(start + marker.length);
  const end = tail.indexOf('\n};');
  if (end === -1) return [];
  const body = tail.slice(0, end);
  return [...body.matchAll(/^\s*([A-Za-z0-9_]+):/gm)].map((m) => m[1]);
}

function diff(expected, actual) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const missing = [...expectedSet].filter((x) => !actualSet.has(x)).sort();
  const extra = [...actualSet].filter((x) => !expectedSet.has(x)).sort();
  return { missing, extra };
}

const snapshot = readJson(resolve(process.cwd(), 'docs/telegram-api-schema.snapshot.json'));
const schemaTs = readFileSync(resolve(process.cwd(), 'src/types/telegram.schema.generated.ts'), 'utf8');
const payloadTs = readFileSync(resolve(process.cwd(), 'src/types/telegram.payloads.generated.ts'), 'utf8');
const resultsTs = readFileSync(resolve(process.cwd(), 'src/types/telegram.results.generated.ts'), 'utf8');

const expectedMethods = Array.isArray(snapshot.methods) ? snapshot.methods.slice().sort() : [];
const expectedUpdateKeys = Array.isArray(snapshot.update_keys) ? snapshot.update_keys.slice().sort() : [];

const methodUnion = parseUnionMembers(schemaTs, 'TelegramApiMethodName').sort();
const updateKeyUnion = parseUnionMembers(schemaTs, 'TelegramUpdateKey').sort();
const payloadKeys = parseMapKeys(payloadTs, 'TelegramApiMethodPayloads').sort();
const resultsKeys = parseMapKeys(resultsTs, 'TelegramApiMethodResults').sort();

const methodUnionDiff = diff(expectedMethods, methodUnion);
const updateKeyUnionDiff = diff(expectedUpdateKeys, updateKeyUnion);
const payloadDiff = diff(expectedMethods, payloadKeys);
const resultsDiff = diff(expectedMethods, resultsKeys);

const issues = [];
if (methodUnionDiff.missing.length || methodUnionDiff.extra.length) {
  issues.push({ check: 'method_union_matches_snapshot', ...methodUnionDiff });
}
if (updateKeyUnionDiff.missing.length || updateKeyUnionDiff.extra.length) {
  issues.push({ check: 'update_key_union_matches_snapshot', ...updateKeyUnionDiff });
}
if (payloadDiff.missing.length || payloadDiff.extra.length) {
  issues.push({ check: 'payload_map_matches_snapshot_methods', ...payloadDiff });
}
if (resultsDiff.missing.length || resultsDiff.extra.length) {
  issues.push({ check: 'results_map_matches_snapshot_methods', ...resultsDiff });
}

const payload = {
  status: issues.length === 0 ? 'ok' : 'failed',
  source: snapshot.source ?? 'unknown',
  expected: {
    methods: expectedMethods.length,
    update_keys: expectedUpdateKeys.length,
  },
  actual: {
    method_union: methodUnion.length,
    update_key_union: updateKeyUnion.length,
    payload_map: payloadKeys.length,
    results_map: resultsKeys.length,
  },
  issues,
};

if (issues.length > 0) {
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(payload, null, 2));
