# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo layout

| Path | Purpose |
|------|---------|
| `cli/` | npm package `chain-hub` — the `chain` binary; Bun runtime |
| `apps/web/` | Marketing site + docs at chainhub.one — Astro + Tailwind CSS v4 |
| `apps/hub/` | Local `chain hub` dashboard — Astro (static) + Tailwind v4; build → `apps/hub/dist/`, packaged as `cli/dist/hub` |
| `core/` | Bundled protected assets (skills, agents, workflows, rules, `registry.yaml`) shipped inside the npm package and copied to `CHAIN_HOME/core/` on `chain init` |

---

## Commands

### CLI (`cli/`)

```bash
cd cli
bun install
bun test                          # run all tests
bun test path/to/file.test.ts     # run a single test file
bun test --filter "test name"     # run by name pattern
bun run dev -- --help             # run chain.ts in-process (no build needed)
bun run build                     # compile → dist/chain.js
bun run pack:check                # full pre-publish pipeline (sync assets + build + checks)
bun run changelog                 # regenerate CHANGELOG.md via git-cliff
```

### Web (`apps/web/`)

```bash
cd apps/web
bun install
bun run dev      # local dev server
bun run build    # production build → dist/
bun run preview  # serve the production build locally
```

---

## CLI architecture

**Entry point:** `cli/chain.ts` — Commander.js router. Every subcommand is registered with `.action(async () => { const { runXxx } = await import("./commands/xxx"); ... })`. All commands are lazy-imported; the entry file itself has no business logic.

**`CHAIN_HOME` resolution order:** `--chain-home` flag → `CHAIN_HOME` env var → persisted config (`~/.config/chain-hub/config.json` or `$XDG_CONFIG_HOME/chain-hub/config.json`) → `~/chain-hub`. The `getChainHome()` utility in `cli/utils/chain-home.ts` is the single source of truth for this resolution.

**Commands** (`cli/commands/`): each file exports a single `runXxx()` async function. No shared state between commands.

**Registry** (`cli/registry/local.ts`): reads and writes `CHAIN_HOME/skills-registry.yaml` (parsed with the `yaml` package). Registry buckets: `core` (protected bundled), `chain_hub` (installed from the index), `personal`, `packs`, `community`, `cli_packages`. GitHub-sourced skills are tracked under `github_sources` with attribution credits. `cli/registry/core.ts` lists which slugs are protected (cannot be removed by the user).

**Adapters** (`cli/adapters/`): one file per IDE implementing `IdeAdapter` from `types.ts`. Each adapter has a `detect()` function and a `links(chainHome)` function returning `{ from, to }` symlink pairs. `chain setup` calls `forceRelink()` on all detected adapters. The `universal` adapter always detects (always links into `~/.agents/`).

**Validation** (`cli/utils/validation.ts` + `cli/utils/validators/`): `validateProject()` walks `CHAIN_HOME` and validates skill/workflow frontmatter and registry consistency.

**Learnings** (`cli/utils/learnings.ts`): `captureLearning()` appends to a JSONL file; `distillLearnings()` is used by `chain reflect` to summarize.

---

## Web architecture

Built with **Astro** (static, `prerender = true`) and **Tailwind CSS v4** using custom design tokens (`bg-bg`, `text-text`, `text-accent`, `text-text-dim`). No JavaScript framework — Astro components only.

**Page files:** `apps/web/src/pages/index.astro` (marketing landing) and `apps/web/src/pages/docs/index.astro` (docs). Both pages delegate sections to components:
- Section components: `apps/web/src/components/sections/` (`Hero`, `Problem`, `HowItWorks`, `Editors`, `SkillsAnatomy`, `CliReference`, `Install`, `Footer`)
- Docs components: `apps/web/src/components/docs/` (`TerminalBlock`, `Callout`, `TocLink`)
- Shared header: `apps/web/src/components/SiteHeader.astro`

The inline `<script is:inline>` in `index.astro` handles cross-section JS (scroll-spy nav, IntersectionObserver animations, terminal typewriter, copy buttons) and must stay in the page file — Astro components cannot export script-level side effects.

---

## Key constraints and gotchas

- **npm `bin` path**: must be `dist/chain.js` (no `./` prefix) in `package.json`. npm 11+ silently drops `bin` entries with a leading `./`, breaking the installed `chain` command.
- **`core/` is read-only from the user's perspective**: user content goes under `CHAIN_HOME/skills/`, `CHAIN_HOME/agents/`, etc. — never inside `core/`. `chain init` syncs `core/` but never overwrites user content in the hub root.
- **Dev alias collision**: a shell alias binding `chain` to `bun run …/cli/chain.ts` will shadow the npm global binary and can cause `chain.ts not found` / `Module not found …/cli/chain.ts` if the path is stale after moving the repo. Prefer `export CHAIN_HUB_REPO="<path-to-repo-root>"` and `alias chain="bun run $CHAIN_HUB_REPO/cli/chain.ts"` so moving the clone updates one variable; or remove the alias when testing the published package.
- **Changelog scope**: git-cliff is configured (`cliff.toml` at repo root) to include only commits touching `cli/**` or `core/**`. Web-only commits are excluded from the CLI changelog. Before **1.0.0**, maintaining `CHANGELOG.md` is optional; from **1.0.0** onward, regenerate with `bun run changelog` in `cli/` before publish (see `cli/CHANGELOG.md` pre-1.0 note).
- **CI**: `.github/workflows/ci.yml` runs `bun test`, `bun run build`, `bun run pack:check` in `cli/` and `bun run build` in `apps/web/` on every push and PR.
