import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(process.cwd(), 'docs/telegram-api-baseline.json');
const raw = readFileSync(file, 'utf8');
const data = JSON.parse(raw);

const required = ['target_bot_api_version', 'source_changelog', 'reviewed_at'];
for (const key of required) {
  if (!data[key] || typeof data[key] !== 'string') {
    console.error(`Missing or invalid field: ${key}`);
    process.exit(1);
  }
}

if (!/^\d+\.\d+$/.test(data.target_bot_api_version)) {
  console.error('target_bot_api_version must look like "9.4"');
  process.exit(1);
}

if (!/^https:\/\//.test(data.source_changelog)) {
  console.error('source_changelog must be https URL');
  process.exit(1);
}

const reviewedAt = new Date(`${data.reviewed_at}T00:00:00Z`);
if (Number.isNaN(reviewedAt.getTime())) {
  console.error('reviewed_at must be YYYY-MM-DD');
  process.exit(1);
}

const ageDays = Math.floor((Date.now() - reviewedAt.getTime()) / (1000 * 60 * 60 * 24));
if (ageDays > 120) {
  console.error(
    `Telegram API baseline is stale (${ageDays} days). Update docs/telegram-api-baseline.json after changelog review.`
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: 'ok',
      target_bot_api_version: data.target_bot_api_version,
      reviewed_at: data.reviewed_at,
      age_days: ageDays
    },
    null,
    2
  )
);
