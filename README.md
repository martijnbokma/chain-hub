# Chain Hub

A local-first AI workspace control plane — one hub folder, one CLI, one dashboard, every editor.

## Philosophy

- **Local first** — everything lives on disk at `~/.chain-hub`. No cloud, no sync service required.
- **Editor-agnostic** — mount the hub into Cursor, Claude Code, Windsurf, Zed, or any editor that reads from a folder.
- **Single source of truth** — one folder, one SQLite index, no duplicated config files.
- **Calm by default** — a minimal surface that grows with deliberate steps.

## Workspace layout

```text
apps/
  hub-web/        React 19 dashboard (Tailwind v4, shadcn/ui, TanStack Query)
packages/
  cli/            chain binary (Commander, Node 22)
  server/         Hono localhost API
  domain/         use-cases and business logic
  storage/        filesystem + SQLite-backed local storage
  contracts/      shared Zod schemas and TypeScript types
```

## Hub folder structure

```text
~/.chain-hub/
  skills/           SKILL.md files
  agents/           agent persona files
  workflows/        workflow .md files
  rules/            rule files
  memory/           markdown notes + learnings log
    learnings/
      events.jsonl  append-only capture log
    reflections/    written reflection snapshots (chain reflect --write)
  system/
    chainhub.sqlite SQLite metadata index
    meta.json       initialization metadata
  logs/
```

## Quickstart

Fastest path — one command builds everything and starts the dashboard:

```bash
bun install
bun run hub
# → http://127.0.0.1:2342
```

`bun run hub` builds all packages, initializes `~/.chain-hub` on first run, starts the API server, and opens the browser. Pass flags after `--`, e.g. `bun run hub -- --no-open --port 3456`.

Step by step, if you want more control:

```bash
# 1. Install
bun install

# 2. Build all packages
bun run build

# 3. Start the dashboard (also initializes ~/.chain-hub on first run)
node packages/cli/dist/index.js hub
# → http://127.0.0.1:2342
```

Override the hub location with `--chain-home <path>` or the `CHAIN_HOME` environment variable:

```bash
CHAIN_HOME=~/my-hub node packages/cli/dist/index.js hub
node packages/cli/dist/index.js --chain-home ./.sandbox-hub hub --port 3456
```

## CLI reference

### Hub management

| Command | Description |
|---|---|
| `chain init` | Initialize hub structure and seed a welcome skill |
| `chain status` | Print a JSON overview of the hub |
| `chain validate` | Check structural integrity; exits 1 if issues found |
| `chain setup` | Create editor symlinks for all supported integrations |
| `chain guide` | Show the guided setup checklist |
| `chain hub [--port N] [--no-open]` | Start the local dashboard (default port 2342, auto-opens browser) |

### Asset management

```bash
chain asset list [--kind <kind>]
chain asset create --kind <kind> --name <name> --content <text>
chain asset show --kind <kind> --name <name>
chain asset update --kind <kind> --name <name> --content <text>
chain asset remove --kind <kind> --name <name>
```

Asset kinds: `skills` · `agents` · `workflows` · `rules`

### Learnings

```bash
# Append an event to the timeline
chain capture --event <type> --skill <slug> --summary "<text>"
# type: success | failure | correction | note

# Print a per-skill reflection report
chain reflect

# Write the report to memory/reflections/YYYY-MM-DD.md
chain reflect --write

# Output raw JSON
chain reflect --json
```

## Dashboard surfaces

| Page | What it does |
|---|---|
| **Setup** | Guided checklist: init → assets → connect → validate |
| **Overview** | Health, asset counts, storage stats |
| **Library** | Browse, create, edit, and delete skills/agents/workflows/rules/prompts |
| **Integrations** | Editor mount status for Cursor, Claude Code, Windsurf, Zed |
| **Settings** | Theme + local-first AI providers (BYOK / Ollama) |

Command palette: **Cmd/Ctrl + K** — navigate, create assets, connect editors, theme/AI shortcuts.

Memory notes and learnings remain available via CLI (`chain capture` / `chain reflect`) and `/api/memory` + `/api/learnings`; there is no Memory/Learnings dashboard page today.

## API routes

The dashboard API runs on the same port as the hub server.

| Method | Path | Description |
|---|---|---|
| GET | `/api/overview` | Hub health, counts, storage |
| GET | `/api/library` | List assets |
| POST | `/api/library` | Create asset |
| GET | `/api/library/:kind/:name` | Get asset detail |
| PUT | `/api/library/:kind/:name` | Update asset |
| DELETE | `/api/library/:kind/:name` | Delete asset |
| GET | `/api/memory` | Memory folder summary |
| GET | `/api/memory/notes` | List all memory notes |
| POST | `/api/memory/notes` | Create a note |
| GET | `/api/memory/note?path=` | Get note content |
| PUT | `/api/memory/note?path=` | Save note content |
| DELETE | `/api/memory/note?path=` | Delete note |
| GET | `/api/memory/search?q=` | Full-text search notes |
| GET | `/api/learnings` | Timeline (supports `?limit=` `?offset=`) |
| POST | `/api/learnings/capture` | Append an event |
| GET | `/api/learnings/reflect` | Per-skill reflection report |
| GET | `/api/setup` | Guided setup checklist |
| GET | `/api/integrations` | Integration status |
| POST | `/api/integrations/setup` | Run editor setup |
| GET | `/api/validate` | Validation result |
| GET | `/api/settings/ai` | AI provider/model settings (no secrets) |
| PUT | `/api/settings/ai` | Update AI settings / API keys |
| POST | `/api/ai/draft-prompt` | Draft asset content with configured provider |

## Global install (development)

Use `bun link` to make the `chain` binary available globally from the monorepo:

```bash
# 1. Build all packages first
bun run build

# 2. Link the CLI package globally
cd packages/cli && bun link

# 3. Now use chain directly
chain init
chain hub
chain capture --event success --skill my-skill --summary "It works"
chain reflect
```

To unlink:

```bash
bun unlink @chain-hub/cli
```

> The `chain` binary calls `dist/index.js` inside `packages/cli/`. Always run `bun run build` after code changes when using the linked binary.

## Development

```bash
# Build all packages in dependency order
bun run build

# Typecheck all packages and apps
bun run typecheck

# Run all tests (storage + domain + server)
bun run test

# Run with a local sandbox hub
node packages/cli/dist/index.js --chain-home ./.sandbox-hub init
node packages/cli/dist/index.js --chain-home ./.sandbox-hub hub --port 3456 --no-open
```

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node 22 (ESM, native SQLite via `node:sqlite`) |
| CLI | Commander |
| API server | Hono + `@hono/node-server` |
| Frontend | React 19, React Router 7, TanStack Query v5 |
| Styling | Tailwind CSS v4, shadcn/ui primitives |
| Validation | Zod |
| Build | tsup (packages), Vite (hub-web) |
| Monorepo | Bun workspaces + Turborepo |
