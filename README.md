# Chain Hub

**Website:** [chainhub.one](https://www.chainhub.one/) — overview, editor support, and quick start.

**Chain Hub** is a small command-line tool (**`chain`**) that helps you keep AI assistant **skills**, **workflows**, **rules**, and **agent** definitions in **one home folder** on your computer, then **connects that folder to your editors** (Cursor, Claude Code, and others) with symlinks—so you install or update content once, and every supported IDE sees the same library.

The program is published on npm as **`chain-hub`**; after installing, you run the **`chain`** command. Source for this monorepo: [github.com/martijnbokma/chain-hub](https://github.com/martijnbokma/chain-hub).

## In plain language

- **Skills** and related files are reusable instructions and setups for coding assistants—not magic, just organized files in a standard layout.
- **Chain Hub** does not replace your editor or your AI product; it **organizes** those assets and **points** your tools at them from a single place (`CHAIN_HOME`, usually `~/chain-hub`).
- You run a few commands once per machine (or after updates), then your IDEs stay in sync without copying folders by hand.

## What you can do with it

- **Initialize** your hub: copy the bundled “core” library and registry files into `CHAIN_HOME`.
- **Link** `CHAIN_HOME` into the folders your editors expect, so skills and agents show up where the IDE looks.
- **List** and **validate** what you have installed.
- **Add** skills from a registry or from GitHub-style sources, **remove** them, or **scaffold** new skills.
- **Point** `CHAIN_HOME` somewhere else if you want backups, sandboxes, or an XDG-style path—see [cli/README.md](cli/README.md).

For the full command list and flags, use **`chain --help`** or read **[cli/README.md](cli/README.md)**.

## Quick start (using npm)

```bash
npm install -g chain-hub
chain init
chain setup
chain list
```

### Keep the CLI up to date

The **`chain`** executable ships in the **`chain-hub`** npm package. Pull the latest release with the same global install you used the first time:

```bash
npm install -g chain-hub
chain --version
```

Then run **`chain init`** so **`CHAIN_HOME/core/`** matches the bundled core in that CLI version. If release notes mention IDE link changes, run **`chain setup`** again. Registry- and GitHub-installed skills are refreshed with **`chain update`** (see **[cli/README.md](cli/README.md)**).

If anything looks wrong, run **`chain validate`** (and **`chain init`** first if the registry file is missing). Details on `CHAIN_HOME`, editors, and advanced usage: **[cli/README.md](cli/README.md)**.

## Repository layout (this monorepo)

| Path | Purpose |
|------|---------|
| `cli/` | NPM package **`chain-hub`** — the **`chain`** command (Bun for dev, test, and build) |
| `apps/web/` | Marketing site and docs for [chainhub.one](https://www.chainhub.one/) — Astro + Tailwind CSS v4 (`bun install` then `bun run dev` / `bun run build`) |
| `core/` | Bundled **protected** assets: skills, workflows, agents, rules, `registry.yaml`, plus `core/templates/` (e.g. shadcn `components.json` for maintainers). On **`chain init`**, this tree is copied to **`CHAIN_HOME/core/`**; your own skills live under **`CHAIN_HOME/skills/`** |

## How your data is organized (technical)

- **Package vs hub:** The CLI comes from **`cli/`** (or from npm as **`chain-hub`**). Your personal library—skills, agents, workflows, rules, and the registry—lives under **`CHAIN_HOME`** (default **`~/chain-hub`**), not inside the npm install path or this repo when you use the defaults.
- **Layers:** **`CHAIN_HOME/core/`** is the protected, versioned copy of bundled assets after **`chain init`**. **Your** content uses the hub root: **`skills/`**, **`agents/`**, **`workflows/`**, **`rules/`**, and **`skills-registry.yaml`** (including provenance). Add personal work there, not inside **`core/`**.
- **IDE links:** **`chain setup`** creates symlinks **from** **`CHAIN_HOME`** **into** editor-specific directories (for example **`~/.cursor`**). A Universal adapter may also mirror into **`~/.agents/`**—treat that as an extra link surface; **`CHAIN_HOME`** remains the single source of truth.
- **Flexibility:** Set **`CHAIN_HOME`** to any directory (sandboxes, backups, or e.g. `$XDG_DATA_HOME/chain-hub` on Unix). See **[cli/README.md](cli/README.md)** for environment details.

## Contributing (developers)

```bash
cd cli
bun install
bun test
bun run dev -- --help    # or: bun run chain.ts --help
```

Install from npm, configure `CHAIN_HOME`, and read the full command reference: **[cli/README.md](cli/README.md)**.

## CI

GitHub Actions runs tests, production build, and package checks for the CLI, and builds the marketing site in `apps/web/`, on pushes and pull requests (see `.github/workflows/ci.yml`).

## Marketing site (`apps/web/`)

```bash
cd apps/web
bun install
bun run dev      # local preview
bun run build    # static output in apps/web/dist/
```
