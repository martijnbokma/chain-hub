# Chain

Monorepo for the **chain** CLI: install and sync AI agent **skills**, **workflows**, **rules**, and **agents** into `CHAIN_HOME`, then wire supported IDEs with symlinks.

## Layout

| Path | Purpose |
|------|---------|
| `cli/` | NPM package `chain-hub` — the `chain` command (Bun for dev/test/build) |
| `core/` | Bundled **protected** assets: skills, workflows, agents, rules, `registry.yaml`, plus `core/templates/` (e.g. shadcn `components.json` for maintainers). On `chain init`, the `core/` tree is copied to `CHAIN_HOME/core/`; user-installed skills stay under `CHAIN_HOME/skills/` |

## User data model

- **Package vs hub:** The CLI ships from `cli/` (npm: `chain-hub`). Your skills, agents, workflows, rules, and registry live under **`CHAIN_HOME`** (default `~/.chain`), not inside the npm install path or this monorepo when you use the defaults.
- **Layers:** **`CHAIN_HOME/core/`** is the protected, versioned copy of bundled assets after `chain init`. **User and registry-installed content** uses the hub root: **`skills/`**, **`agents/`**, **`workflows/`**, **`rules/`**, and **`skills-registry.yaml`** (provenance). Do not treat `core/` as the place to add personal files; keep user work in those top-level folders.
- **IDE links:** **`chain setup`** symlinks from **`CHAIN_HOME`** into editor-specific directories (for example `~/.cursor`). The Universal adapter also targets **`~/.agents/`** for skills and agents — use that as an extra link surface, not as a second library root; **`CHAIN_HOME` stays the single source of truth.**
- **Flexibility:** Set **`CHAIN_HOME`** to any directory (sandboxes, backups, or e.g. `$XDG_DATA_HOME/chain` on Unix if you follow XDG). See **[cli/README.md](cli/README.md)** for env details.

## Quick start (contributors)

```bash
cd cli
bun install
bun test
bun run dev -- --help    # or: bun run chain.ts --help
```

Install toolchain details, `CHAIN_HOME`, and full command reference: see **[cli/README.md](cli/README.md)**.

## CI

GitHub Actions runs tests, production build, and package checks on pushes and pull requests (see `.github/workflows/ci.yml`).
