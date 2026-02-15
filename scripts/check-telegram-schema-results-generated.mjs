import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const generatedPath = resolve(process.cwd(), 'src/types/telegram.results.generated.ts');
const scriptPath = resolve(process.cwd(), 'scripts/generate-telegram-schema-results.mjs');

const tempDir = mkdtempSync(join(tmpdir(), 'tgwrapper-results-check-'));
const tempOut = join(tempDir, 'telegram.results.generated.ts');

try {
  execFileSync(process.execPath, [scriptPath], {
    cwd: process.cwd(),
    env: { ...process.env, TGWRAPPER_RESULTS_OUT: tempOut },
    stdio: 'pipe'
  });
} catch (error) {
  rmSync(tempDir, { recursive: true, force: true });
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        reason: 'result generation command failed during check',
        details: error instanceof Error ? error.message : String(error)
      },
      null,
      2
    )
  );
  process.exit(1);
}

const current = readFileSync(generatedPath, 'utf8');
let expected = '';
try {
  expected = readFileSync(tempOut, 'utf8');
} catch {
  rmSync(tempDir, { recursive: true, force: true });
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        reason: 'temporary results file was not generated'
      },
      null,
      2
    )
  );
  process.exit(1);
}

rmSync(tempDir, { recursive: true, force: true });

if (current !== expected) {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        reason: 'generated telegram result types are out of date',
        fix: 'Run `pnpm telegram:schema:results:generate` and commit src/types/telegram.results.generated.ts'
      },
      null,
      2
    )
  );
  process.exit(1);
}

console.log(JSON.stringify({ status: 'ok' }, null, 2));
