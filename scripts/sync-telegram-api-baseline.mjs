import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CHANGELOG_URL = 'https://core.telegram.org/bots/api-changelog';
const baselinePath = resolve(process.cwd(), 'docs/telegram-api-baseline.json');

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const writeChanges = args.has('--write');
const allowNetworkFailure = args.has('--allow-network-failure');

if (!checkOnly && !writeChanges) {
  console.error('Usage: node scripts/sync-telegram-api-baseline.mjs [--check|--write] [--allow-network-failure]');
  process.exit(1);
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    return null;
  }
  return { major: Number(match[1]), minor: Number(match[2]) };
}

function compareVersions(a, b) {
  if (a.major !== b.major) {
    return a.major - b.major;
  }
  return a.minor - b.minor;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function extractLatestBotApiVersion(changelogHtml) {
  const matches = [...changelogHtml.matchAll(/Bot API\s+(\d+\.\d+)/gi)].map((m) => m[1]);
  if (matches.length === 0) {
    return null;
  }

  const parsed = matches
    .map((version) => ({ version, parsed: parseVersion(version) }))
    .filter((item) => item.parsed !== null);

  if (parsed.length === 0) {
    return null;
  }

  parsed.sort((left, right) => compareVersions(left.parsed, right.parsed));
  return parsed[parsed.length - 1].version;
}

async function main() {
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  const currentTarget = String(baseline.target_bot_api_version ?? '').trim();
  if (!parseVersion(currentTarget)) {
    throw new Error(`Invalid target_bot_api_version in baseline: "${currentTarget}"`);
  }

  let latestVersion;
  try {
    const response = await fetch(CHANGELOG_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch changelog: HTTP ${response.status}`);
    }
    const changelogHtml = await response.text();
    latestVersion = extractLatestBotApiVersion(changelogHtml);
    if (!latestVersion) {
      throw new Error('Unable to parse latest Bot API version from changelog');
    }
  } catch (error) {
    if (allowNetworkFailure) {
      console.log(
        JSON.stringify(
          {
            status: 'warning',
            reason: 'network_or_parse_error',
            message: error instanceof Error ? error.message : 'unknown error'
          },
          null,
          2
        )
      );
      process.exit(0);
    }
    throw error;
  }

  const parsedCurrent = parseVersion(currentTarget);
  const parsedLatest = parseVersion(latestVersion);
  const relation = compareVersions(parsedCurrent, parsedLatest);

  if (checkOnly) {
    if (relation < 0) {
      console.error(
        JSON.stringify(
          {
            status: 'outdated',
            current_target: currentTarget,
            latest_changelog: latestVersion,
            action: 'Run `pnpm telegram:baseline:sync` and update local types/tests/docs.'
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
          status: relation === 0 ? 'up_to_date' : 'ahead_of_changelog_parse',
          current_target: currentTarget,
          latest_changelog: latestVersion
        },
        null,
        2
      )
    );
    return;
  }

  if (relation < 0) {
    baseline.target_bot_api_version = latestVersion;
    baseline.reviewed_at = toIsoDate(new Date());
    baseline.source_changelog = CHANGELOG_URL;
    baseline.notes = 'Auto-synced target version from Telegram Bot API changelog. Review local types/tests/docs before release.';

    writeFileSync(baselinePath, JSON.stringify(baseline, null, 2).replace(/\n$/, '') + '\n', 'utf8');
  } else if (relation === 0) {
    baseline.reviewed_at = toIsoDate(new Date());
    writeFileSync(baselinePath, JSON.stringify(baseline, null, 2).replace(/\n$/, '') + '\n', 'utf8');
  }

  console.log(
    JSON.stringify(
      {
        status: relation < 0 ? 'updated' : 'no_version_change',
        current_target_before: currentTarget,
        latest_changelog: latestVersion,
        baseline_file: baselinePath
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
