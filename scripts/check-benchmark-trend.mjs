import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = process.cwd();
const latestPath = resolve(repoRoot, 'benchmark/reports/latest.json');
const baselinePath = resolve(repoRoot, 'benchmark/reports/baseline.json');

const latest = JSON.parse(readFileSync(latestPath, 'utf8'));
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));

const latestUps = Number(latest.updates_per_sec ?? 0);
const baselineUps = Number(baseline.updates_per_sec ?? 0);
const minRatio = Number(process.env.BENCHMARK_MIN_RATIO ?? '0.55');
const minUps = Number(process.env.BENCHMARK_MIN_UPS ?? '180000');
const ratio = baselineUps > 0 ? latestUps / baselineUps : 0;

console.log(
  JSON.stringify(
    {
      latest_updates_per_sec: latestUps,
      baseline_updates_per_sec: baselineUps,
      ratio,
      min_ratio: minRatio,
      min_updates_per_sec: minUps
    },
    null,
    2
  )
);

if (ratio < minRatio && latestUps < minUps) {
  console.error(
    `Benchmark regression detected: ratio=${ratio.toFixed(3)} is below min_ratio=${minRatio.toFixed(3)} and updates_per_sec=${latestUps} is below min_updates_per_sec=${minUps}.`
  );
  process.exit(1);
}

console.log('Benchmark trend check passed.');
