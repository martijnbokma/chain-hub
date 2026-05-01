## Learned User Preferences
- User prefers Dutch-language collaboration and phrasing in this workspace.
- User wants explicit provenance tracking for skills, including GitHub source grouping and credits.
- User values direct command-style triggers for skills (for example creating dedicated slash-style skills for immediate use).
- User expects continual-learning runs to follow strict incremental-index rules and exact output contracts when no updates are found.
- User prefers command examples to be shown as terminal-style blocks with prompts and aligned presentation.
- User prefers design choices to be explored with side-by-side visual examples before implementation.
- User prefers English for committed repository documentation; personal operational runbooks (for example continual-learning and npm release workflows) live under `.cursor/private/`, which is gitignored.

## Learned Workspace Facts
- `CHAIN_HOME` resolves in this order: `--chain-home`, `CHAIN_HOME` env, `chain config set chain_home` (persisted in `~/.config/chain-hub/config.json` or `$XDG_CONFIG_HOME/chain-hub/config.json`), then default `~/.chain`; commands like `init`, `status`, and `validate` show the active path and source. A dev shell alias that binds `chain` to `bun run …/cli/chain.ts` shadows the npm global binary and can cause missing-`chain.ts` errors until the alias is removed or renamed.
- Workspace maintains incremental continual-learning state in `.cursor/hooks/state/continual-learning-index.json`.
- When a Chain Hub home includes `skills-registry.yaml`, it can track ownership via `authorship.self`, chain-hub entries, and GitHub bundle provenance under `github_sources` with credits.
- The published npm package is `chain-hub`; the executable is `chain`, implemented under `cli/`. Marketing site https://www.chainhub.one/ and `/docs` are built with Astro from `apps/web/` (`bun run build` → `apps/web/dist/`).
- Shipped protected content lives in repository `core/` (skills, rules, agents, workflows, `registry.yaml`, and `core/templates/` such as shadcn scaffolding); `chain init` copies `core/` into `CHAIN_HOME` and syncs listed protected agents and workflows into `CHAIN_HOME/agents/` and `CHAIN_HOME/workflows/` for IDE adapters.
- **Single user hub:** `CHAIN_HOME` (default `~/.chain`) is the canonical location for all data managed by Chain Hub: after `chain init`, `core/` holds the protected bundled copy; user and registry-installed content lives at the hub root in `skills/`, `agents/`, `workflows/`, `rules/`, and `skills-registry.yaml`. IDE adapters symlink *from* `CHAIN_HOME`; Universal links may also mirror into `~/.agents/`, but that path is not a second primary library root.
- User-installed skills live under `CHAIN_HOME/skills/`; user-defined agents and workflows sit beside protected slugs under `agents/` and `workflows/`; `chain list` separates protected core from user content where applicable.
- GitHub Actions CI in `.github/workflows/ci.yml` runs `bun test`, `bun run build`, and `bun run pack:check` in `cli/`, and `bun run build` in `apps/web/`, on push and pull requests.
- Changelog maintenance uses git-cliff with repository-root `cliff.toml` and `cli/` scripts `changelog` / `changelog:preview` (conventional `feat` / `fix` / `revert` limited to `cli/**` and `core/**` per config).
- For npm pack/publish (notably npm 11+), `package.json` `bin` paths must not use a `./` prefix (for example `dist/chain.js`, not `./dist/chain.js`); otherwise npm may drop the `bin` entry as invalid.
- Validator allows reserved skill names for registered upstream GitHub sources while still rejecting custom reserved names.
- Syncing Chain Hub without `.git/` across Syncthing/Dropbox-like tools can propagate large `skills/` deletions from reduced inventories.
