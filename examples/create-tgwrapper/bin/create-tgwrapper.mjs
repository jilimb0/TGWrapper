#!/usr/bin/env node
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createInterface } from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

const templates = {
  standard: {
    packageName: "@tgwrapper/starter-standard-bot",
    source: "standard-bot",
    scripts: { build: "tsc", start: "tsx src/bot.ts" },
    dependencies: {
      "@tgwrapper/core": "^0.16.0",
      "@tgwrapper/adapter-redis": "^0.8.0",
      "@tgwrapper/observability": "^0.9.0",
      ioredis: "^5.4.1",
    },
  },
  support: {
    packageName: "@tgwrapper/starter-support-bot",
    source: "support-bot",
    scripts: { build: "tsc", start: "tsx src/bot.ts" },
    dependencies: {
      "@tgwrapper/core": "^0.16.0",
      "@tgwrapper/adapter-redis": "^0.8.0",
      "@tgwrapper/observability": "^0.9.0",
      ioredis: "^5.4.1",
    },
  },
  migration: {
    packageName: "@tgwrapper/starter-migration",
    source: "migration-starter",
    scripts: {
      build: "tsc",
      "start:before": "tsx src/bot-before.ts",
      "start:after": "tsx src/bot-after.ts",
    },
    dependencies: {
      "@tgwrapper/core": "^0.16.0",
      "@tgwrapper/adapter-redis": "^0.8.0",
      "@tgwrapper/observability": "^0.9.0",
      ioredis: "^5.4.1",
      telegraf: "^4.16.3",
    },
  },
}

const args = process.argv.slice(2)
const options = parseArgs(args)
const rl = createInterface({ input, output })

try {
  const projectName =
    options.projectName || (await rl.question("Project name: "))
  const templateName = options.template || (await askTemplate())
  const template = templates[templateName]

  if (!projectName) fail("Project name is required.")
  if (!template)
    fail(
      `Unknown template "${templateName}". Use standard, support, or migration.`,
    )

  const targetDir = resolve(process.cwd(), projectName)
  if (existsSync(targetDir) && readdirSync(targetDir).length > 0) {
    fail(`Target directory is not empty: ${targetDir}`)
  }

  const templateRoot = findTemplateRoot(template)
  mkdirSync(targetDir, { recursive: true })

  cpSync(join(templateRoot, "src"), join(targetDir, "src"), { recursive: true })
  copyIfExists(
    join(templateRoot, "tsconfig.json"),
    join(targetDir, "tsconfig.json"),
  )
  copyIfExists(
    join(templateRoot, ".env.example"),
    join(targetDir, ".env.example"),
  )
  copyIfExists(join(templateRoot, "README.md"), join(targetDir, "README.md"))

  const generatedPackage = {
    name: toPackageName(projectName),
    version: "0.1.0",
    private: true,
    engines: { node: ">=22.13" },
    type: "module",
    scripts: template.scripts,
    dependencies: template.dependencies,
    devDependencies: {
      "@types/node": "^20.11.0",
      typescript: "^5.3.3",
      tsx: "^4.7.0",
    },
  }
  writeFileSync(
    join(targetDir, "package.json"),
    `${JSON.stringify(generatedPackage, null, 2)}\n`,
  )

  console.log(`Created ${projectName} from ${template.packageName}`)
  console.log(
    `Next: cd ${projectName} && cp .env.example .env && pnpm install && pnpm start`,
  )
} finally {
  rl.close()
}

function parseArgs(values) {
  const parsed = {}
  for (let i = 0; i < values.length; i++) {
    const value = values[i]
    if (value === "--template" || value === "-t") {
      parsed.template = values[++i]
    } else if (!value.startsWith("-") && !parsed.projectName) {
      parsed.projectName = value
    }
  }
  return parsed
}

async function askTemplate() {
  const answer = await rl.question("Template (standard/support/migration): ")
  return answer.trim()
}

function findTemplateRoot(template) {
  const currentDir = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    resolve(currentDir, "..", "..", template.source),
    resolve(currentDir, "..", "node_modules", template.packageName),
    resolve(currentDir, "..", "..", "..", template.source),
    // When installed as a peer in node_modules (e.g. tempDir/node_modules/@tgwrapper/create),
    // sibling packages live at node_modules/@tgwrapper/<pkg-name>
    resolve(currentDir, "..", "..", "..", template.packageName),
  ]

  for (const candidate of candidates) {
    if (
      existsSync(join(candidate, "package.json")) &&
      existsSync(join(candidate, "src"))
    )
      return candidate
  }

  fail(`Cannot find installed template package ${template.packageName}.`)
}

function copyIfExists(from, to) {
  if (existsSync(from)) copyFileSync(from, to)
}

function toPackageName(value) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "tgwrapper-bot"
  )
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
