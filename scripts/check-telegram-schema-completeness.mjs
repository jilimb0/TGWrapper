import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const latestPath = resolve(process.cwd(), 'docs/telegram-api-schema.latest.json');
const baselinePath = resolve(process.cwd(), 'docs/telegram-api-baseline.json');

const latest = readJson(latestPath);
const baseline = readJson(baselinePath);

const minMethods = Number(baseline.min_method_count ?? 120);
const minUpdateKeys = Number(baseline.min_update_key_count ?? 20);

const methodCount = Array.isArray(latest.methods) ? latest.methods.length : 0;
const updateKeyCount = Array.isArray(latest.update_keys) ? latest.update_keys.length : 0;
const source = latest.source ?? 'unknown';

const issues = [];
if (source !== 'telegram-api-doc') {
  issues.push(`schema source must be telegram-api-doc, got ${source}`);
}
if (methodCount < minMethods) {
  issues.push(`method_count ${methodCount} is below min_method_count ${minMethods}`);
}
if (updateKeyCount < minUpdateKeys) {
  issues.push(`update_key_count ${updateKeyCount} is below min_update_key_count ${minUpdateKeys}`);
}

if (issues.length > 0) {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        issues,
        latest: { source, method_count: methodCount, update_key_count: updateKeyCount },
        baseline: { min_method_count: minMethods, min_update_key_count: minUpdateKeys },
        fix: 'Refresh parser/snapshot from Telegram docs and ensure full Bot API coverage before release.'
      },
      null,
      2
    )
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: 'ok',
      source,
      method_count: methodCount,
      update_key_count: updateKeyCount,
      baseline: { min_method_count: minMethods, min_update_key_count: minUpdateKeys }
    },
    null,
    2
  )
);
