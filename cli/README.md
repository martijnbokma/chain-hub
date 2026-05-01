# Chain Hub CLI

**Site:** [chainhub.one](https://www.chainhub.one/) · **Repository:** [github.com/martijnbokma/chain-hub](https://github.com/martijnbokma/chain-hub)

Manage AI agent skills and IDE symlinks from one place with **Chain Hub**. Published as **`chain-hub`** on npm; the executable name is **`chain`**.

## Requirements

- [Bun](https://bun.sh) (for development and tests)
- Node **20+** when running the built `dist/chain.js` after `bun run build`

## Installation (from this repo)

Replace `<REPO_ROOT>` with wherever you cloned the repository (for example `~/Code/chain-hub`).

```bash
cd <REPO_ROOT>/cli
bun install
```

**Run without a global install** — add to `~/.zshrc` or `~/.bashrc`:

```bash
alias chain="bun run <REPO_ROOT>/cli/chain.ts"
```

**Or** build a single file and put it on your `PATH`:

```bash
cd <REPO_ROOT>/cli
bun build --target=node --outfile dist/chain.js chain.ts
# Executable: node dist/chain.js — or use `bun build --compile` if you prefer a native binary
```

**From npm** (when published):

```bash
npm install -g chain-hub
chain --help
```

## Keeping the CLI up to date (npm)

The **`chain`** binary comes from the **`chain-hub`** package. Re-run the global install whenever you want a newer CLI (npm installs the latest version unless you pinned one):

```bash
npm install -g chain-hub
chain --version
```

After upgrading the CLI, run **`chain init`** so **`CHAIN_HOME/core/`** matches the bundled core shipped with that version. Run **`chain setup`** again if release notes say IDE symlink layouts changed.

Skills you installed from the registry or from configured GitHub bundles are updated separately with **`chain update`**.

## Environment

| Variable      | Default     | Description |
|---------------|-------------|-------------|
| `CHAIN_HOME`  | `~/.chain`  | **Canonical user hub:** skills, agents, workflows, rules, `skills-registry.yaml`, and (after `chain init`) the **`core/`** subtree. |

Resolution priority for hub location:

1. `--chain-home <path>` flag (per command)
2. `CHAIN_HOME` environment variable
3. `chain config set chain_home <path>` (persisted user config)
4. default `~/.chain`

### Hub layout (recommended model)

- **One root:** All user data for Chain Hub lives under **`CHAIN_HOME`**. The npm package (or a local source checkout for development) only delivers the **`chain`** binary and bundled **`core/`** source packaged into the CLI; it is not your personal library location unless you deliberately set `CHAIN_HOME` inside a checkout.
- **Core vs user:** **`CHAIN_HOME/core/`** is the protected copy installed by **`chain init`**. **Your** skills, agents, workflows, and custom rules belong in **`CHAIN_HOME/skills/`**, **`agents/`**, **`workflows/`**, **`rules/`** (plus registry files at the hub root). This matches common “flat top-level folders + `skills/<slug>/SKILL.md`” patterns used by agent tooling ecosystems.
- **`~/.agents`:** Some adapters symlink hub **`skills/`** and **`agents/`** into **`~/.agents/`** for tools that expect that layout. Treat **`~/.agents`** as an **IDE-facing mirror**, not a separate primary library — edit and back up **`CHAIN_HOME`**.
- **Sandboxes:** For contributors or experiments, point **`CHAIN_HOME`** at a throwaway directory so **`chain init`** / **`chain add`** never touch another hub or a git working tree you care about.

```bash
export CHAIN_HOME="$HOME/.chain"
# Optional XDG-style example (create the directory first):
# export CHAIN_HOME="${XDG_DATA_HOME:-$HOME/.local/share}/chain"
```

## First-time setup

1. **`chain init`** — copies packaged **`core/`** into `CHAIN_HOME` and ensures `skills-registry.yaml`.
2. **`chain setup`** — symlinks `skills`, `agents`, `workflows`, and supported paths into detected IDEs.
3. **`chain list`** / **`chain validate`** — inspect and verify the tree.

```
chain init
chain setup
chain list
chain validate
```

If **`chain validate`** reports a missing **`skills-registry.yaml`**, run **`chain init`** first.

## Usage in projects

You typically do **not** install the CLI per project. After `chain setup`, IDEs read skills from `CHAIN_HOME` via symlinks.

## Commands (overview)

| Command | Purpose |
|--------|---------|
| `chain setup` | Create or refresh IDE symlinks (`--ide <name>` for one IDE) |
| `chain status` | Show symlink health per IDE |
| `chain list` | List skills with registry labels and optional GitHub bundle info |
| `chain search <query>` | Search remote/registry sources (when configured) |
| `chain add <slug>` | Install from registry or `github:owner/repo` |
| `chain update` | Refresh registry and GitHub-bundle skills from their sources |
| `chain remove <slug>` | Remove a registry-installed skill |
| `chain new <slug>` | Scaffold a new skill under `CHAIN_HOME/skills/` |
| `chain validate` | Validate skills and workflows (built-in checks; use `--fix` where supported) |
| `chain fix` | Auto-fix some frontmatter/section issues |
| `chain init` | Install/update protected core assets into `CHAIN_HOME` |
| `chain config get chain_home` | Show active `CHAIN_HOME` and source |
| `chain config set chain_home <path>` | Persist default hub path in user config |
| `chain config unset chain_home` | Remove persisted hub path (falls back to env/default) |

Supported IDEs include Cursor, Windsurf, Claude Code, Antigravity, Gemini CLI, Trae, Kiro, Mistral Vibe (`~/.vibe/skills`), and a Universal `.agents/` fallback — see `chain setup --help`.

### Examples

```bash
chain setup
chain setup --ide cursor
chain --chain-home ~/.chain-sandbox init
chain config set chain_home ~/my-chain-home
chain add github:owner/repo
chain validate
chain validate --fix
```

## Typical workflow on a new machine

```bash
npm install -g chain-hub

# Optional: point CHAIN_HOME at a dedicated directory
export CHAIN_HOME="$HOME/.chain"
echo 'export CHAIN_HOME="$HOME/.chain"' >> ~/.zshrc

chain init
chain setup
chain status
```

To upgrade an existing install: **`npm install -g chain-hub`**, then **`chain init`** (and **`chain setup`** if needed). Use **`chain update`** for registry/GitHub skills.

## Development

```bash
cd cli
bun test              # full test suite
bun run dev -- --help # run CLI via Bun
bun run build         # emit dist/chain.js
bun run pack:check    # sync core/ (incl. core/templates) into cli/, build, verify package files
```
