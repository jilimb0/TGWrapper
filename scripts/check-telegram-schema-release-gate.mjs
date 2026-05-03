import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function hasTelegramFollowupChangeset() {
  const dir = resolve(process.cwd(), '.changeset');
  const files = readdirSync(dir).filter((name) => name.endsWith('.md') && name !== 'README.md');
  for (const name of files) {
    const content = readFileSync(resolve(dir, name), 'utf8');
    if (!/"@jilimb0\/tgwrapper"\s*:\s*"(major|minor|patch)"/.test(content)) {
      continue;
    }
    if (/telegram|bot api|compat|schema/i.test(content)) {
      return true;
    }
  }
  return false;
}

function hasTelegramFollowupInChangelog() {
  const changelogPath = resolve(process.cwd(), 'CHANGELOG.md');
  const content = readFileSync(changelogPath, 'utf8');
  return /telegram|bot api|compat|schema/i.test(content);
}

const reportPath = resolve(process.cwd(), 'docs/telegram-api-schema.drift-report.json');
const report = readJson(reportPath);
const driftCount = Number(report.drift_count ?? 0);

if (report.snapshot_source !== 'telegram-api-doc') {
  console.log(
    JSON.stringify(
      {
        status: 'warning',
        reason: 'schema_snapshot_not_remote_calibrated',
        snapshot_source: report.snapshot_source,
        action: 'Promote snapshot fetched from Telegram API docs before enabling strict drift blocking.'
      },
      null,
      2
    )
  );
  process.exit(0);
}

if (driftCount === 0) {
  console.log(
    JSON.stringify(
      {
        status: 'ok',
        reason: 'no_schema_drift'
      },
      null,
      2
    )
  );
  process.exit(0);
}

const hasFollowup = hasTelegramFollowupChangeset() || hasTelegramFollowupInChangelog();
if (hasFollowup) {
  console.log(
    JSON.stringify(
      {
        status: 'ok',
        reason: 'schema_drift_with_followup_recorded',
        drift_count: driftCount
      },
      null,
      2
    )
  );
  process.exit(0);
}

console.error(
  JSON.stringify(
    {
      status: 'failed',
      reason: 'schema_drift_without_followup_changeset',
      drift_count: driftCount,
      required: 'Add a changeset for @jilimb0/tgwrapper mentioning telegram/schema compatibility follow-up.'
    },
    null,
    2
  )
);
process.exit(1);
