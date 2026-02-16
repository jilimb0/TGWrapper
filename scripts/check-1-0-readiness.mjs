import fs from "node:fs";

const rootPackage = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const baseline = JSON.parse(
  fs.readFileSync(new URL("../docs/telegram-api-baseline.json", import.meta.url), "utf8"),
);
const releaseReadinessWorkflow = fs.readFileSync(
  new URL("../.github/workflows/release-readiness.yml", import.meta.url),
  "utf8",
);
const ciWorkflow = fs.readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");

const requiredFiles = [
  "docs/RELEASE_1.0.0_PLAN.md",
  "docs/DEFINITION_OF_DONE_1.0.0.md",
  "docs/RELEASE_POLICY.md",
  "docs/PRODUCTION_CHECKLIST.md",
  "docs/TELEGRAM_API_COMPATIBILITY.md",
  "docs/OBSERVABILITY_CONTRACT.md",
  "docs/OPERATIONS_RUNBOOK.md",
  "src/types/telegram.schema.generated.ts",
  "src/types/telegram.payloads.generated.ts",
  "src/types/telegram.results.generated.ts",
  "scripts/check-telegram-schema-full-coverage.mjs",
];

const requiredVerifyReleaseParts = [
  "pnpm changeset:lint",
  "pnpm telegram:baseline:check",
  "pnpm telegram:schema:types:check",
  "pnpm telegram:schema:payloads:check",
  "pnpm telegram:schema:results:check",
  "pnpm test",
  "pnpm typecheck:compat",
  "pnpm -r typecheck",
  "pnpm build",
  "pnpm -r build",
  "pnpm api:snapshot:check",
  "pnpm pack:size",
];

const requiredVerify1Parts = [
  "pnpm verify:release",
  "pnpm telegram:schema:completeness:check",
  "pnpm telegram:schema:coverage:full:check",
  "pnpm benchmark",
  "pnpm benchmark:trend:release",
  "pnpm check:1.0:readiness",
];

const missingFiles = requiredFiles.filter((file) => !fs.existsSync(new URL(`../${file}`, import.meta.url)));
const verifyRelease = rootPackage.scripts?.["verify:release"] ?? "";
const verify1 = rootPackage.scripts?.["verify:1.0"] ?? "";

const missingVerifyReleaseParts = requiredVerifyReleaseParts.filter((part) => !verifyRelease.includes(part));
const missingVerify1Parts = requiredVerify1Parts.filter((part) => !verify1.includes(part));

const checks = {
  target_bot_api_version: baseline.target_bot_api_version === "9.4",
  schema_min_methods: Number(baseline.min_method_count) >= 150,
  schema_min_update_keys: Number(baseline.min_update_key_count) >= 20,
  verify_release_exists: typeof verifyRelease === "string" && verifyRelease.length > 0,
  verify_release_parts: missingVerifyReleaseParts.length === 0,
  verify_1_0_exists: typeof verify1 === "string" && verify1.length > 0,
  verify_1_0_parts: missingVerify1Parts.length === 0,
  benchmark_trend_release_script: typeof rootPackage.scripts?.["benchmark:trend:release"] === "string",
  full_coverage_script: typeof rootPackage.scripts?.["telegram:schema:coverage:full:check"] === "string",
  required_files_exist: missingFiles.length === 0,
  release_readiness_has_reliability:
    releaseReadinessWorkflow.includes("Repeat load and chaos checks") &&
    releaseReadinessWorkflow.includes("pnpm test:integration"),
  ci_has_redis_integration:
    ciWorkflow.includes("redis-integration") &&
    ciWorkflow.includes("pnpm --filter @jilimb0/tgwrapper-adapter-redis test:integration"),
};

const failed = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

const payload = {
  status: failed.length === 0 ? "ok" : "fail",
  checks,
  missing_files: missingFiles,
  missing_verify_release_parts: missingVerifyReleaseParts,
  missing_verify_1_0_parts: missingVerify1Parts,
};

console.log(JSON.stringify(payload, null, 2));
if (failed.length > 0) {
  process.exit(1);
}
