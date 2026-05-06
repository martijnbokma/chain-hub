---
name: chain-hub
description: >-
  Chain Hub monorepo and on-disk hub: CHAIN_HOME resolution, protected core vs
  user skills, registry buckets, IDE adapters, and chain init / setup / update
  / validate / status / list. Use for chain-hub development (cli, core,
  apps/web), explaining how assets sync to editors, hub migration, skills not
  appearing in an editor, mistakes with registry.yaml and CHAIN_HOME/core/, or
  troubleshooting wrong binary, broken symlinks, and sync tools.
version: 1.2.0
complexity: medium
last_updated: 2026-05-04
tags: [chain-hub, cli, chain-home, core]
---

# Chain Hub

Use this skill when working **in or on** the [Chain Hub](https://www.chainhub.one/) monorepo (the `chain` CLI and bundled `core/` assets), or when guiding someone through **their** `CHAIN_HOME` setup and day-to-day updates.

## When to Use

- Editing or reviewing code under `cli/`, bundled content under `core/`, or the marketing site under `apps/web/`
- Explaining how skills reach Cursor, Claude Code, Windsurf, or other linked editors after `chain setup`
- Choosing between `chain init`, `chain update`, and `chain validate` for a given situation
- Clarifying **protected core** (`CHAIN_HOME/core/`, mirrored from the package) versus **user skills** (`CHAIN_HOME/skills/` and registry buckets)
- **`CHAIN_HOME` wrong or moved** — resolution order, env vars, or `chain config`
- **A skill does not show up in an editor** — symlinks, `chain setup`, adapter detection (see **Troubleshooting**)
- **Mysterious CLI behavior** — wrong binary, alias, or stale `CHAIN_HOME` (see **Troubleshooting**)
- **Authoring a personal skill** — where on disk to put it (hub vs core); for SKILL.md structure and frontmatter, also apply **`create-skill`** in this hub’s bundled skills

## NOT When to Use

- General application development in unrelated repositories (use project-local rules and skills there)

## Quick path: hub-only users

Use this section when the user is **not** editing the Chain Hub git repo — only their hub on disk.

| Situation | Minimal steps |
|-----------|----------------|
| First-time or new machine | `chain init` then `chain setup`; confirm with `chain status` |
| Upgraded `chain-hub` npm package | `chain init` (refresh `CHAIN_HOME/core/`), then `chain setup` if linking or adapters changed |
| Skill missing in Cursor / Claude / etc. | `chain status` (see `CHAIN_HOME` and symlink health), then `chain setup`; re-open editor if it caches paths |
| `chain validate` errors | Fix paths or frontmatter it reports; user skills belong under `CHAIN_HOME/skills/<slug>/`, not under `CHAIN_HOME/core/` |
| Install or refresh from registry / GitHub | `chain add` / `chain update` as appropriate, then `chain validate` |
| Personal skill authoring | Create `CHAIN_HOME/skills/<slug>/SKILL.md`, register slug in `skills-registry.yaml` if required by your workflow, then `chain setup` |

**Remember:** `CHAIN_HOME` resolves in this order: `--chain-home` → `CHAIN_HOME` env → persisted `chain config` → default `~/chain-hub` (see `getChainHome()` in `cli/utils/chain-home.ts` in the repo).

## Troubleshooting

- **Wrong `chain` or “cannot find module …/chain.ts”** — A shell alias such as `alias chain='bun run /old/path/cli/chain.ts'` shadows the global npm binary; after moving the repo the path goes stale. Prefer `export CHAIN_HUB_REPO="<repo-root>"` and `alias chain="bun run $CHAIN_HUB_REPO/cli/chain.ts"`, or drop the alias when testing the installed package. Check with `command -v chain` / `type chain`.
- **`chain status` reports broken IDE links** — `chain setup` may create symlinks even when the target file under `rules/` (or similar) does not exist yet. Create the missing path or adjust the hub layout; then run `chain setup` again.
- **`chain validate` fails on “nested” or unknown layout** — Skills expect a **flat** layout: only `CHAIN_HOME/skills/<slug>/` (no category subfolders under `skills/`). Move or flatten directories to match.
- **Skills vanished after sync (Syncthing, Dropbox, etc.)** — A partial replica can propagate deletions into `skills/`. Prefer a single writer for the hub or exclude `skills/` from risky sync patterns; restore from backup or re-`chain add` sources.
- **CLI upgraded but bundled skills look old** — Run `chain init` so `CHAIN_HOME/core/` matches the installed package; then `chain setup` if editors still show stale content.

## Source of truth (two layers)

**1. This repository (contributors)**

| Path | Role |
|------|------|
| `cli/` | npm package `chain-hub` — the `chain` binary |
| `core/` | Bundled protected assets: skills, agents, workflows, rules, `core/registry.yaml` |
| `apps/web/` | Marketing and docs site |

After publish, users run **`chain init`** so their **`CHAIN_HOME/core/`** matches the bundled tree from their installed CLI version.

**2. A machine’s hub (`CHAIN_HOME`, default `~/chain-hub`)**

| Path | Role |
|------|------|
| `core/` | Copy of bundled assets from the CLI; do not treat as the place for personal skill authoring |
| `skills/`, `agents/`, `workflows/`, `rules/` | User and installed content; edit skills here for personal use |
| `skills-registry.yaml` | Tracks buckets, GitHub sources, provenance |

Resolution order for `CHAIN_HOME`: see **`getChainHome()`** in `cli/utils/chain-home.ts` (flag → env → config file → default path).

## Conventions

- **User-authored skills** live under `CHAIN_HOME/skills/<slug>/`, not inside `CHAIN_HOME/core/`
- **Bundled core skills** are edited in **this repo** under `core/skills/<slug>/` and listed in `core/registry.yaml` under `protected.skills`
- After changing symlink targets or adapter behavior, update docs (`README.md`, `cli/README.md`) and run **`bun test`** in `cli/`

## How to work

1. Confirm whether the task is **monorepo maintenance** (edit `cli/` or `core/` in git) or **hub usage** (edit files under `CHAIN_HOME` on disk).
2. For CLI changes: `cd cli && bun install && bun test`; use `bun run dev -- --help` to exercise `chain.ts` locally.
3. For new **core** skills: add `core/skills/<slug>/SKILL.md` and add `<slug>` to `core/registry.yaml` → `protected.skills`.
4. After releases, remind users to run **`chain init`** (and **`chain setup`** if linking changed) so `CHAIN_HOME/core/` stays aligned with their CLI version.

## Key principles

- **Single hub on disk**: `CHAIN_HOME` is the SSOT for linked editors; adapters create symlinks *into* editor config dirs.
- **Core is protected**: `chain` treats core slugs as non-removable; user installs go through registry buckets and `chain update` for GitHub sources.
- **Validate often**: `chain validate` catches registry drift and bad skill frontmatter.

## Output format

When summarizing changes:

- State which tree changed: **repo** (`cli/`, `core/`, `apps/web/`) vs **local hub** (`CHAIN_HOME/...`).
- Note whether user-facing docs or `chain init` / `chain setup` behavior needs an update.

## Constraints

- Do not instruct users to commit secrets or machine-only paths into shared hub repos.
- npm `bin` in `cli/package.json` must stay compatible with npm 11+ (see `CLAUDE.md`).

## Key references

- [README.md](https://github.com/martijnbokma/chain-hub/blob/main/README.md) — product overview and quick start
- [CLAUDE.md](https://github.com/martijnbokma/chain-hub/blob/main/CLAUDE.md) — monorepo architecture for agents
- [cli/README.md](https://github.com/martijnbokma/chain-hub/blob/main/cli/README.md) — full CLI command reference

## Quality metrics

- **Completeness**: 9/10 — Repo vs hub, quick path, troubleshooting, and contributor tables
- **Clarity**: 9/10 — End-user flows first; troubleshooting for common real-world footguns
