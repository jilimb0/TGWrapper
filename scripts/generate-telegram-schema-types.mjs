import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const snapshotPath = resolve(process.cwd(), 'docs/telegram-api-schema.snapshot.json');
const outPath = resolve(process.cwd(), 'src/types/telegram.schema.generated.ts');

const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
const methods = Array.isArray(snapshot.methods) ? [...new Set(snapshot.methods)].sort() : [];
const updateKeys = Array.isArray(snapshot.update_keys) ? [...new Set(snapshot.update_keys)].sort() : [];

if (methods.length === 0 || updateKeys.length === 0) {
  console.error('Schema snapshot is empty or invalid. Run telegram:schema:fetch first.');
  process.exit(1);
}

const file = `/**
 * AUTO-GENERATED FILE. DO NOT EDIT.
 * Source: docs/telegram-api-schema.snapshot.json
 * Generated at: ${new Date().toISOString()}
 */

export type TelegramApiMethodName =
${methods.map((m) => `  | '${m}'`).join('\n')};

export type TelegramUpdateKey =
${updateKeys.map((k) => `  | '${k}'`).join('\n')};
`;

writeFileSync(outPath, file, 'utf8');
console.log(
  JSON.stringify(
    {
      status: 'ok',
      out: outPath,
      methods: methods.length,
      update_keys: updateKeys.length
    },
    null,
    2
  )
);
