# @tgwrapper/create

Official TGWrapper project scaffolder.

> **Requirements:** Node.js `>=22.13`, `pnpm`, `tsx`
>
> Use this tool to bootstrap a new TGWrapper project with the recommended starter packages.

## Quick Start

```bash
pnpm create @tgwrapper my-bot --template standard
cd my-bot
cp .env.example .env
pnpm install
pnpm start
```

Available templates:

| Template    | Package                           |
| ----------- | --------------------------------- |
| `standard`  | `@tgwrapper/starter-standard-bot` |
| `support`   | `@tgwrapper/starter-support-bot`  |
| `migration` | `@tgwrapper/starter-migration`    |

## Options

```bash
pnpm create @tgwrapper [project-name] --template standard
pnpm create @tgwrapper [project-name] --template support
pnpm create @tgwrapper [project-name] --template migration
```

The generated project includes `src`, `tsconfig.json`, `.env.example`, and a ready-to-install `package.json`.
