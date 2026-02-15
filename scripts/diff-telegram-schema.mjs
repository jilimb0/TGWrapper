import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function asSet(values) {
  return new Set(Array.isArray(values) ? values : []);
}

function diffSets(from, to) {
  const added = [...to].filter((value) => !from.has(value)).sort();
  const removed = [...from].filter((value) => !to.has(value)).sort();
  return { added, removed };
}

const args = new Set(process.argv.slice(2));
const latestArg = process.argv.find((arg) => arg.startsWith('--latest='));
const snapshotArg = process.argv.find((arg) => arg.startsWith('--snapshot='));
const reportArg = process.argv.find((arg) => arg.startsWith('--report='));

const latestPath = resolve(process.cwd(), latestArg ? latestArg.slice('--latest='.length) : 'docs/telegram-api-schema.latest.json');
const snapshotPath = resolve(
  process.cwd(),
  snapshotArg ? snapshotArg.slice('--snapshot='.length) : 'docs/telegram-api-schema.snapshot.json'
);
const reportPath = resolve(
  process.cwd(),
  reportArg ? reportArg.slice('--report='.length) : 'docs/telegram-api-schema.drift-report.json'
);

const latest = readJson(latestPath);
const snapshot = readJson(snapshotPath);

const methodDiff = diffSets(asSet(snapshot.methods), asSet(latest.methods));
const updateKeyDiff = diffSets(asSet(snapshot.update_keys), asSet(latest.update_keys));

const report = {
  generated_at: new Date().toISOString(),
  latest_source: latest.source,
  latest_source_url: latest.source_url,
  snapshot_source: snapshot.source,
  method_diff: methodDiff,
  update_key_diff: updateKeyDiff,
  drift_count: methodDiff.added.length + methodDiff.removed.length + updateKeyDiff.added.length + updateKeyDiff.removed.length
};

writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

console.log(JSON.stringify(report, null, 2));

if (args.has('--check') && report.drift_count > 0) {
  process.exit(1);
}
