# Chain Hub — Agent Rules

Single source of truth for all AI agents (Claude Code, Codex, Cursor, Windsurf). `CLAUDE.md` imports this file.

**Chain Hub** is a local-first AI workspace control plane: one hub folder (`~/.chain-hub`), one CLI (`chain`), one dashboard, synced into Cursor, Claude Code, Windsurf, Zed and Google Antigravity. Philosophy: local-first, editor-agnostic, minimal surface, grows deliberately.

Canonical repo: `martijnbokma/chain-hub` (local folder may be named `chain-hub-v2`).

## Read on demand (not every session)

| File | Load when |
|---|---|
| `PROJECT_MAP.md` | Locating files for a feature area |
| `notes/REBUILD_STRATEGY.md` | Product scope or architecture decisions (lives in private `chain-hub-notes`, cloned locally as gitignored `notes/`) |
| `apps/hub-web/DESIGN.md`, `apps/hub-web/PRODUCT.md` | Any hub-web UI work |
| `notes/docs/intent/`, `notes/docs/specs/` | Skills control plane / skill install work |
| `notes/docs/archive/` | Historical only — not a source of truth |

## Stack

- **Workspace**: Bun 1.3 workspaces + Turborepo, Node ≥ 22.13, ESM only
- **TypeScript**: 5.x in `packages/*`, 6.x in `apps/*` — check the package's tsconfig
- **Backend**: Commander 12 (CLI), Hono 4 + `@hono/node-server` (server), tsup (build), Zod (validation), `yaml` (frontmatter). No database: the hub folder on disk is the only store
- **Frontend**: React 19, React Router 7, TanStack Query 5, Tailwind CSS 4 (`@theme` tokens, no `tailwind.config.js`), shadcn/ui, cva, clsx + tailwind-merge, cmdk, lucide-react, sonner, Vite 8
- **Tests**: Vitest everywhere, Testing Library in hub-web, Playwright e2e in `apps/hub-web/e2e/`

Exact versions live in each `package.json` — do not trust versions quoted in docs.

## Layout and boundaries

```
apps/hub-web/          React dashboard — consumes contracts + HTTP API only
apps/docs/             Documentation site (Vite + MDX)
apps/marketing-site/   Marketing site (under development, inline coming-soon page)
packages/contracts/    @chain-hub/contracts — Zod schemas + types, no deps
packages/storage/      @chain-hub/storage — hub folder I/O + editor adapters
packages/domain/       @chain-hub/domain — use-cases, wraps storage, AI providers
packages/server/       @chain-hub/server — Hono routes mapping domain to HTTP
packages/cli/          chain-hub (npm name) — `chain` binary, Commander
```

- Dependency direction: `contracts ← storage ← domain ← server/cli`. hub-web never imports domain or storage.
- Only `packages/storage` reads or writes the hub folder (`src/core.ts`, `src/skill-install.ts`). Never bypass it.
- Changing an API: update the Zod schema in `packages/contracts/src/` first.
- Schema naming is camelCase with `Schema` suffix: `captureEventSchema`, `overviewSchema`, `aiProviderSchema`, `integrationSchema`. Types are inferred from them.

## Commands

```bash
bun install
bun run build            # all packages, dependency order
bun run dev              # everything: server + hub-web + docs + marketing + packages (watch); frees dev ports first and prints the URLs
bun run dev:hub          # hub only: server + hub-web + packages (watch)
bun run dev:docs         # docs site
bun run dev:marketing    # marketing site
bun run hub              # build + start dashboard (port 2342)
bun run lint             # ESLint 9 flat config, whole workspace
bun run typecheck
bun run test             # all Vitest suites
bun run test:e2e         # Playwright (hub-web)

# Scoped — prefer these while iterating
bunx turbo run test --filter=@chain-hub/storage
bunx turbo run typecheck --filter=@chain-hub/hub-web
cd packages/storage && bunx vitest run src/skill-install.test.ts
```

CI (`.github/workflows/ci.yml`) runs build → lint → typecheck → `test:coverage` → e2e. Run lint, typecheck and relevant tests before delivering.

CLI surface: `chain init|status|validate|setup|guide|hub`, `chain asset list|create|show|update|remove|discover|import`, `chain skill install|update|check-updates|migrate-agents|fork`, `chain capture`, `chain reflect`. Asset kinds: `skills`, `agents`, `workflows`, `rules`, `prompts`.

## Code conventions

- TypeScript strict, no `any`. Named exports. ESM `import`/`export` only; use `import.meta.url` for paths.
- Follow the nearest existing file. Pattern references:
  - Hono route: `packages/server/src/routes/library.ts`
  - HTTP error mapping: `packages/server/src/http-errors.ts` (`app.onError` — Zod → 400, `HubError` → its status). Routes just `parse` and throw; no per-route try/catch
  - Domain errors: throw `InvalidInputError` / `NotFoundError` / `ConflictError` from `packages/contracts/src/errors.ts`; `AiProviderError` in `packages/domain/src/ai-transport.ts` (re-exported from `ai-providers.ts`)
  - Commander command: `packages/cli/src/index.ts`
  - Editor adapter: `packages/storage/src/adapters/cursor.ts`
  - Page: `apps/hub-web/src/components/pages/LibraryPage.tsx`
  - API client: `apps/hub-web/src/lib/api.ts`
- Tests colocated as `*.test.ts(x)` next to source. New functionality needs tests.
- Code comments and docs in English.

### Frontend rules

- Use shadcn/ui primitives from `apps/hub-web/src/components/ui/`. Never hand-roll buttons, inputs, dialogs, dropdowns. If a primitive is missing, add the smallest one and say so.
- Pending async actions: use the `loading` prop on `Button` (spinner + auto-disable + `aria-busy`) — don't hand-roll `disabled={isPending}` + spinner markup. For status flips and result entrances use the `icon-in` pop, `animate-pulse`, and staggered `fade-up` keyframes in `styles.css`; icon-only buttons may spin their own icon instead (e.g. `RefreshCw animate-spin`).
- Tailwind semantic tokens only (`bg-background`, `text-muted-foreground`, `border-border`, `bg-primary`). No hex codes, no arbitrary values, 4px spacing scale.
- `cn()` for class merging, `cva` for variants, lucide-react for icons, sonner `toast` for feedback (no wrapper).
- AI UI uses prompt-kit building blocks (`prompt-input.tsx`, `prompt-suggestion.tsx`, `loader.tsx`) styled with Signaal tokens.
- Accessibility: labels on inputs, visible `:focus-visible`, keyboard navigation, `aria-label` on icon-only buttons.
- For new UI with unclear direction: propose 2–3 layout directions and wait for a choice before implementing.

## Hub folder (`~/.chain-hub`, override with `CHAIN_HOME`)

`skills/`, `agents/`, `workflows/`, `rules/`, `prompts/` (assets) · `memory/learnings/events.jsonl` (append-only capture log) · `memory/reflections/` · `system/meta.json`, `system/skills-lock.json`, `system/ai-config.json`, `system/secrets.json` (mode 0600) · `backups/<date>/` (hand-written editor files replaced by sync/import) · `logs/`

## Git

- Work directly on `develop`. Do not create feature/fix/chore branches or PRs unless the user asks for one.
- One topic per commit: split unrelated changes into separate commits so `develop` history stays readable.
- Keep `develop` CI green (lint, typecheck, `test:coverage`, e2e) — without PRs it is the only safety net.
- `main` is release-only and protected (CI must pass, no force-push): never commit to it directly. Release flow (release-please, `.github/workflows/release.yml` + `release-please-config.json`):
  1. Fast-forward `main` so it gets the exact commit CI checked on `develop`: `git switch main && git merge --ff-only develop && git push`
  2. Release-please opens/updates a release PR on `main` (branch `release-please--branches--main--components--chain-hub`) that accumulates the version bump and the generated `packages/cli/CHANGELOG.md`. Review that changelog in the PR — this is the changelog review gate; if a change is missing, its commit subject was not conventional.
  3. Merge the release PR → tag (`chain-hub-vX.Y.Z`), GitHub release, and npm publish (`--tag beta`) happen automatically. The release PR never gets CI checks (`GITHUB_TOKEN` PRs don't trigger workflows) — merge it with `gh pr merge --admin`. To re-run a missed/failed publish: `gh workflow run release.yml` (dispatch always runs the publish job).
  4. Merge `main` back into `develop` so the next `--ff-only` does not fail.

Conventional Commits with package scope: `feat(hub-web): add command palette shortcut`. Scopes: `hub-web`, `docs`, `cli`, `server`, `domain`, `storage`, `contracts`. The changelog only shows `feat`, `fix`, `perf` and `revert` — `chore`, `test`, `ci`, `docs`, `refactor`, `style`, `build` are hidden by design. Write subjects for the changelog reader (user-facing impact), not the diff.

## Never

- Commit `.env`, `~/.chain-hub/system/secrets.json` contents, or any secret
- Add a dependency, add a database or index store, or change a public API contract without asking
- Add legacy Pro/licensing code to core packages
- Edit marketplace/upstream-installed skills in place (changes get overwritten) — contribute upstream

## Ask first when

Requirements are ambiguous, package ownership is unclear, code contradicts this file, or the change is a UX decision. State the conflict and offer options instead of guessing.

## Learned User Preferences

- Hub UI should feel premium, simple, sleek, and trustworthy—not a dense console/terminal aesthetic and not marketing-card or AI-slop layouts (oversized radii, sparse stadium cards, eyebrow-on-everything).
- Signaal is the chosen visual direction (shared with apps/marketing-site): light default (paper `#f2f0eb` page, `#fbfaf8` surfaces, ink `#1c1d1f` text, accent `#d9482b`) plus switchable Signaal dark (ink `#1c1d1f` canvas, `#242629` panels, paper text, accent-bright `#ff8a5b`); orange as the sole brand accent in both themes (One Signal—not for status dots or hover/selection fills); ~10–12px radius; Geist + Geist Mono; theme switch via header, Settings → Appearance, and ⌘K.
- Standardize hub-web layouts by surface type (Direction A): dashboard Overview as default landing (`/`); checklist for Setup (under Settings, not primary nav) and Integrations; workspace master–detail for Library and Catalog (browse may use compact asset cards). Primary nav: Overview → Library → Catalog → Learnings → Integrations → Settings. Library chrome: Create + Discover (and skills Install/Update) in the Assets title row; search below title; search + ownership filters side-by-side from `sm` when browsing (wide master), stacked when the detail panel narrows the master column.
- Prefer rebuilding UI against existing design-system components and tokens; flag gaps and make the smallest addition rather than inventing one-off primitives.
- Often writes requests in Dutch; treat Dutch instructions as first-class and follow them directly.
- Library should surface skill provenance/source and ownership filters (All / Editable / Upstream): Editable vs Upstream comes from `skills-lock` (not authorship)—path/git installs are Upstream even when user-authored; no lock or `upload://` is Editable; Editable ≠ authored. To keep personal skills Editable, install via dashboard upload (`upload://`), not `chain skill install --path`. Author search uses frontmatter `metadata.author`.
- Prefer a single canonical hub at `~/.chain-hub` for CLI and dashboard; avoid parallel alternate `CHAIN_HOME` locations for day-to-day use.
- Hub AI should stay local-first (BYOK cloud providers + Ollama; no Chain cloud); AI drafting belongs in the Create flow for all asset kinds (not only prompts), including suggesting the best kind when the intent is ambiguous; detail panel supports Reassess kind (+ Convert) and per-asset Audit with severity findings, then apply/improve from audit; audit is a best-practices quality gate that may return no findings when the asset already meets the bar—no endless polish loops, but stay critical for material gaps; Editable filter is the foundation for AI improve/optimize.
- Surface deterministic editor-compat issues for skills (e.g. missing/empty description for Zed) in Library via badges + detail panel Fix (e.g. from heading), with a save/sync gate—separate from AI Audit quality checks.
- AI-drafted prompts/content should be written in English even when the user writes intents in Dutch; surface LLM failures as plain user-friendly messages, not raw API JSON.

## Learned Workspace Facts

- Design source of truth for hub-web is `apps/hub-web/DESIGN.md`, `apps/hub-web/PRODUCT.md`, and local `apps/hub-web/.impeccable/` (gitignored agent/design tooling—not committed).
- Personal skills vault lives at `/Users/silverfox/www/skills` (shared design skill lives there; not vendored under `.claude/skills/` in this repo).
- Cross-IDE rules direction: one hub-owned SSOT with global and project-scoped rules, projected/synced into each editor's native rules format (Cursor, Claude Code, Windsurf, Zed) rather than separate per-IDE rule trees.
- Chain Hub is the skills control plane: install/manage once in Hub, project into editors via adapters; do not maintain parallel Claude/Cursor skill inventories for Hub-managed skills (`notes/docs/intent/hub-skills-control-plane.md`, `notes/docs/specs/hub-skill-install.md`).
- External `npx skills add` / `~/.agents` installs are imported into Hub on `chain hub` / `chain setup` start (no force overwrite), with remaining agents↔Hub drift surfaced on Overview/Library. Zed consumes projected skills under `~/.agents/skills/` and requires a non-empty description (multiline YAML block scalars must parse correctly on project).
- Discover lists only editor candidates whose `kind/name` is not already in the hub inventory (in addition to skipping Chain-Hub-managed editor files).
- Two Devin-family adapters: `windsurf` keeps legacy paths only (skills → `~/.codeium/windsurf/skills/`, rules/workflows → `~/.windsurf/{rules,workflows}/`); `devin` ("Devin CLI") owns the Devin generation (skills → `~/.config/devin/skills/`, agents → `~/.config/devin/agents/` as subagent profiles, rules/workflows → `~/.devin/{rules,workflows}/` shared with Devin Desktop; workflows also project as `triggers: [user]` skills into `~/.config/devin/skills/` for `/name` invocation). Devin installed = `~/.config/devin` (`%APPDATA%\devin` on Windows) or `~/.devin` exists.
- Hub AI settings live under `/settings`: provider/model config in `~/.chain-hub/system/ai-config.json`, API keys in `~/.chain-hub/system/secrets.json`. Providers are listed in `aiProviders` (`packages/contracts/src/ai.ts`): Anthropic, OpenAI, Mistral, Ollama, Gemini, Groq, OpenRouter, DeepSeek, Cerebras. AI endpoints: `POST /api/ai/draft-prompt`, `/api/ai/classify-asset`, `/api/ai/audit-asset`, `/api/ai/improve-asset`.
- Learnings have a hub-web page at `/learnings` (primary nav) backed by `/api/learnings`; capture/reflect also via CLI.
- Skill update checks: `check-updates` probes git remotes (`git ls-remote` HEAD) and persists `latestSha`/`lastCheckedAt` in `skills-lock.json`; `hasSkillUpdate(entry)` derives the flag. Probes are cached for `SKILL_UPDATE_CHECK_TTL_MS` (15 min, `force` bypasses). `chain hub` runs the check in the background at start; Library badges/Update-button read it on the skills tab.
