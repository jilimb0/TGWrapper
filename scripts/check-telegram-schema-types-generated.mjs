import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const snapshotPath = resolve(process.cwd(), 'docs/telegram-api-schema.snapshot.json');
const generatedPath = resolve(process.cwd(), 'src/types/telegram.schema.generated.ts');

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeArray(input) {
  return Array.isArray(input) ? [...new Set(input)].sort() : [];
}

const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
const generated = readFileSync(generatedPath, 'utf8');

const methods = normalizeArray(snapshot.methods);
const updateKeys = normalizeArray(snapshot.update_keys);

const expectedFingerprint = digest(JSON.stringify({ methods, updateKeys }));
const methodsSection = generated.match(/export type TelegramApiMethodName =([\s\S]*?)\n\nexport type TelegramUpdateKey =/);
const updateSection = generated.match(/export type TelegramUpdateKey =([\s\S]*)$/);

const generatedMethods = methodsSection
  ? [...methodsSection[1].matchAll(/\|\s*'([A-Za-z][A-Za-z0-9_]*)'/g)].map((m) => m[1])
  : [];
const generatedUpdateKeys = updateSection
  ? [...updateSection[1].matchAll(/\|\s*'([a-z_][a-z0-9_]*)'/g)].map((m) => m[1])
  : [];
const actualFingerprint = digest(
    JSON.stringify({
    methods: normalizeArray(generatedMethods),
    updateKeys: normalizeArray(generatedUpdateKeys)
  })
);

if (expectedFingerprint !== actualFingerprint) {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        reason: 'generated telegram schema types are out of date',
        fix: 'Run `pnpm telegram:schema:types:generate` and commit src/types/telegram.schema.generated.ts'
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
      methods: methods.length,
      update_keys: updateKeys.length
    },
    null,
    2
  )
);
