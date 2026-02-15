import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const latestPath = resolve(process.cwd(), 'docs/telegram-api-schema.latest.json');
const snapshotPath = resolve(process.cwd(), 'docs/telegram-api-schema.snapshot.json');

if (!existsSync(latestPath)) {
  console.error(`Latest schema file not found: ${latestPath}`);
  process.exit(1);
}

copyFileSync(latestPath, snapshotPath);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      from: latestPath,
      to: snapshotPath
    },
    null,
    2
  )
);
