# Chain Hub — Agent Rules

Single source of truth for all AI agents (Claude Code, Codex, Cursor, Windsurf). `CLAUDE.md` imports this file.

**Chain Hub** is a local-first AI workspace control plane: one hub folder (`~/.chain-hub`), one CLI (`chain`), one dashboard, synced into Cursor, Claude Code, Windsurf, Zed and Google Antigravity. Philosophy: local-first, editor-agnostic, minimal surface, grows deliberately.

This repository is a read-only mirror of the canonical source. Issues
and PRs are welcome; maintainers sync them upstream. Release
history lives in `packages/*/CHANGELOG.md` and on GitHub releases. The public repo is a
read-only mirror synced per release with
`bun apps/chain-hub/scripts/export-oss.ts --push` (see
`docs/guides/deploy-workflow.md`).

## Read on demand (not every session)

| File | Load when |
|---|---|
| `PROJECT_MAP.md` | Locating files for a feature area |
| `../notes/REBUILD_STRATEGY.md` | Product scope or architecture decisions (lives in private `chain-hub-notes`, cloned locally to `../notes/` — gitignored, never tracked here) |
| `web/DESIGN.md`, `web/PRODUCT.md` | Any hub-web UI work |
| `../notes/docs/intent/`, `../notes/docs/specs/` | Skills control plane / skill install work |
| `../notes/docs/archive/` | Historical only — not a source of truth |

## Stack

- **Workspace**: Bun 1.3 workspaces + Turborepo, Node ≥ 22.13, ESM only
- **TypeScript**: 5.x in `packages/*`, 6.x in `web/` — check the package's tsconfig
- **Backend**: Commander 12 (CLI), Hono 4 + `@hono/node-server` (server), tsup (build), Zod (validation), `yaml` (frontmatter). No database: the hub folder on disk is the only store
- **Frontend**: React 19, React Router 7, TanStack Query 5, Tailwind CSS 4 (`@theme` tokens, no `tailwind.config.js`), shadcn/ui, cva, clsx + tailwind-merge, cmdk, lucide-react, sonner, Vite 8
- **Tests**: Vitest everywhere, Testing Library in hub-web, Playwright e2e in `web/e2e/`

Exact versions live in each `package.json` — do not trust versions quoted in docs.

## Layout and boundaries

```
web/                   React dashboard (@chain-hub/hub-web) — consumes contracts + HTTP API only
packages/contracts/    @chain-hub/contracts — Zod schemas + types, no deps
packages/storage/      @chain-hub/storage — hub folder I/O + editor adapters
packages/domain/       @chain-hub/domain — use-cases, wraps storage, AI providers
packages/server/       @chain-hub/server — Hono routes mapping domain to HTTP
packages/cli/          chain-hub (npm name) — `chain` binary, Commander
```

The marketing site and docs site are sibling surfaces in the same
product dir: `../site/` (@silvfox/site-chain-hub) and `../docs/`
(@silvfox/site-chain-hub-docs).

Two changelog feeds exist, do not merge them: the platform feed
(`@silvfox/changelog`, `../site/changelog.config.ts`, rendered at
`/changelog` on the marketing site) covers Silvfox-owned surfaces —
commits under `apps/chain-hub/site/**`. The per-package `CHANGELOG.md`
files under `packages/*/` and the docs site's `changelog.mdx` belong to
the upstream `release-please`/OSS boundary. The site feed is opt-in
(`noteworthyOnly`): only commits with `[changelog]` in the subject or a
`Release-Note:` trailer appear — write them for visitors, never internal
`@silvfox/*` package names.

- Dependency direction: `contracts ← storage ← domain ← server/cli`. hub-web never imports domain or storage.
- Only `packages/storage` reads or writes the hub folder (`src/core.ts`, `src/skill-install.ts`). Never bypass it.
- Changing an API: update the Zod schema in `packages/contracts/src/` first.
- Schema naming is camelCase with `Schema` suffix: `captureEventSchema`, `overviewSchema`, `aiProviderSchema`, `integrationSchema`. Types are inferred from them.

## Commands

Run from the silvfox repo root (turbo resolves the workspace):

```bash
bun run dev:chainhub     # server + hub-web + packages (watch), dashboard :4320, API :2342
bun run dev:chainhub:site    # marketing site (:4322)
bun run dev:chainhub:docs    # docs site (:4323, /docs/)
bun run hub              # build + start dashboard (port 2342) — inside this app
bunx turbo run build test typecheck --filter=@chain-hub/*
bun run lint             # ESLint 9 flat config — inside this app

# Scoped — prefer these while iterating
bunx turbo run test --filter=@chain-hub/storage
bunx turbo run typecheck --filter=@chain-hub/hub-web
cd packages/storage && bunx vitest run src/skill-install.test.ts
```

Verification lives at the silvfox root (`bun run check`) plus scoped turbo filters below. Run lint, typecheck and relevant tests before delivering.

CLI surface: `chain init|status|validate|setup|guide|hub`, `chain asset list|create|show|update|remove|discover|import`, `chain skill install|update|check-updates|migrate-agents|fork`, `chain catalog list|install|refresh`, `chain security scan`, `chain capture`, `chain reflect [--apply]`. Asset kinds: `skills`, `agents`, `workflows`, `rules`, `prompts`.

Security scanning: every write boundary that brings outside content into the hub (skill installs from path/git/catalog/bundle, updates, relinks, agents-migration, editor imports) passes through `runSecurityGate` in `packages/storage/src/security-gate.ts` — a static rules engine (`security-scan.ts`: credentials/exfil/RCE/destructive/prompt-injection/persistence/obfuscation) plus an optional AI layer (`packages/domain/src/security.ts`, best-effort; provider errors are recorded as `aiError` and never block). Verdicts `pass|warn|fail` persist per asset in `system/security-scans.json`; `fail` throws `SecurityScanError` → HTTP 403 with `{ error, scan }` before anything is copied. Overrides: `--allow-unsafe` (CLI) / `allowUnsafe` (API/UI "Install anyway") set `overriddenAt` on the record; `edit` context caps at warn so authoring never blocks; `rescan` context never throws. Rescan via `POST /api/security/rescan` or `chain security scan [--kind --name]`.

## Code conventions

- TypeScript strict, no `any`. Named exports. ESM `import`/`export` only; use `import.meta.url` for paths.
- Follow the nearest existing file. Pattern references:
  - Hono route: `packages/server/src/routes/library.ts`
  - HTTP error mapping: `packages/server/src/http-errors.ts` (`app.onError` — Zod → 400, `HubError` → its status). Routes just `parse` and throw; no per-route try/catch
  - Domain errors: throw `InvalidInputError` / `NotFoundError` / `ConflictError` from `packages/contracts/src/errors.ts`; `AiProviderError` in `packages/domain/src/ai-transport.ts` (re-exported from `ai-providers.ts`)
  - Commander command: `packages/cli/src/index.ts`
  - Editor adapter: `packages/storage/src/adapters/cursor.ts`
  - Page: `web/src/components/pages/LibraryPage.tsx`
  - API client: `web/src/lib/api.ts`
- Tests colocated as `*.test.ts(x)` next to source. New functionality needs tests.
- Code comments and docs in English.

### Frontend rules

- Use shadcn/ui primitives from `web/src/components/ui/`. Never hand-roll buttons, inputs, dialogs, dropdowns. If a primitive is missing, add the smallest one and say so.
- The primitives carry Calaca `ca-*` class contracts (spec 035 wave 5): `styles.css` imports `@usecalaca/ui` core + base skin after tailwind, this file's own `@theme` re-declares the shared `--color-*` names so the skin resolves Signaal colors, and `:root` bridges the remaining `--ca-*` tokens (radii, overlay). `@usecalaca/ui` is a `workspace:*` dep like `@silvfox/devkit` — swap it for a semver range when the package ships. Deliberately bespoke: sidebar, tabs pills.
- Pending async actions: use the `loading` prop on `Button` (spinner + auto-disable + `aria-busy`) — don't hand-roll `disabled={isPending}` + spinner markup. For status flips and result entrances use the `icon-in` pop, `animate-pulse`, and staggered `fade-up` keyframes in `styles.css`; icon-only buttons may spin their own icon instead (e.g. `RefreshCw animate-spin`).
- Tailwind semantic tokens only (`bg-background`, `text-muted-foreground`, `border-border`, `bg-primary`). No hex codes, no arbitrary values, 4px spacing scale.
- `cn()` for class merging, `cva` for variants, lucide-react for icons, sonner `toast` for feedback (no wrapper).
- AI UI uses prompt-kit building blocks (`prompt-input.tsx`, `prompt-suggestion.tsx`, `loader.tsx`) styled with Signaal tokens.
- Accessibility: labels on inputs, visible `:focus-visible`, keyboard navigation, `aria-label` on icon-only buttons.
- For new UI with unclear direction: propose 2–3 layout directions and wait for a choice before implementing.

## Hub folder (`~/.chain-hub`, override with `CHAIN_HOME`)

`skills/`, `agents/`, `workflows/`, `rules/`, `prompts/` (assets) · `memory/learnings/events.jsonl` (append-only capture log) · `memory/learnings/resolved.json` (addressed checkpoints) · `memory/learnings/folds/<date>/` (fold audit trail: findings + before/after) · `memory/reflections/` · `system/meta.json`, `system/skills-lock.json`, `system/ai-config.json`, `system/secrets.json` (mode 0600) · `backups/<date>/` (hand-written editor files replaced by sync/import) · `logs/`

## Git

- Silvfox git workflow applies (see root `AGENTS.md`): atomic local commits on `develop`, Conventional Commits, explicit paths only, never auto-push.
- Verify with `bun run check` at the repo root plus scoped `bunx turbo run test typecheck --filter=@chain-hub/*` for chain-hub changes.
- Keep package-scoped subjects (`feat(cli): …`, `fix(hub-web): …`) — if the product is ever extracted back to a standalone OSS repo, the history stays changelog-friendly. Scopes: `hub-web`, `cli`, `server`, `domain`, `storage`, `contracts`.

## Never

- Commit `.env`, `~/.chain-hub/system/secrets.json` contents, or any secret
- Add a dependency, add a database or index store, or change a public API contract without asking
- Add legacy Pro/licensing code to core packages
- Edit marketplace/upstream-installed skills in place (changes get overwritten) — contribute upstream

## Ask first when

Requirements are ambiguous, package ownership is unclear, code contradicts this file, or the change is a UX decision. State the conflict and offer options instead of guessing.

## Learned User Preferences

- Hub UI should feel premium, simple, sleek, and trustworthy—not a dense console/terminal aesthetic and not marketing-card or AI-slop layouts (oversized radii, sparse stadium cards, eyebrow-on-everything).
- Signaal is the chosen visual direction (shared with `apps/chain-hub/site`): light default (paper `#f2f0eb` page, `#fbfaf8` surfaces, ink `#1c1d1f` text, accent `#d9482b`) plus switchable Signaal dark (ink `#1c1d1f` canvas, `#242629` panels, paper text, accent-bright `#ff8a5b`); orange as the sole brand accent in both themes (One Signal—not for status dots or hover/selection fills); ~10–12px radius; Geist + Geist Mono; theme switch via header, Settings → Appearance, and ⌘K.
- Standardize hub-web layouts by surface type (Direction A): dashboard Overview as default landing (`/`); checklist for Setup (under Settings, not primary nav) and Integrations; workspace master–detail for Library and Catalog (browse may use compact asset cards). Primary nav: Overview → Library → Catalog → Learnings → Integrations → Settings. Library chrome: Create + Discover (and skills Install/Update) in the Assets title row; search below title; search + ownership filters side-by-side from `sm` when browsing (wide master), stacked when the detail panel narrows the master column.
- Prefer rebuilding UI against existing design-system components and tokens; flag gaps and make the smallest addition rather than inventing one-off primitives.
- Often writes requests in Dutch; treat Dutch instructions as first-class and follow them directly.
- Library should surface skill provenance/source and ownership filters (All / Editable / Upstream): Editable vs Upstream comes from `skills-lock` (not authorship)—path/git installs are Upstream even when user-authored; no lock or `upload://` is Editable; Editable ≠ authored. To keep personal skills Editable, install via dashboard upload (`upload://`), not `chain skill install --path`. Author search uses frontmatter `metadata.author`.
- Prefer a single canonical hub at `~/.chain-hub` for CLI and dashboard; avoid parallel alternate `CHAIN_HOME` locations for day-to-day use.
- Hub AI should stay local-first (BYOK cloud providers + Ollama; no Chain cloud); AI drafting belongs in the Create flow for all asset kinds (not only prompts), including suggesting the best kind when the intent is ambiguous; detail panel supports Reassess kind (+ Convert) and per-asset Audit with severity findings, then apply/improve from audit; audit is a best-practices quality gate that may return no findings when the asset already meets the bar—no endless polish loops, but stay critical for material gaps; Editable filter is the foundation for AI improve/optimize.
- Surface deterministic editor-compat issues for skills (e.g. missing/empty description for Zed) in Library via badges + detail panel Fix (e.g. from heading), with a save/sync gate—separate from AI Audit quality checks.
- AI-drafted prompts/content should be written in English even when the user writes intents in Dutch; surface LLM failures as plain user-friendly messages, not raw API JSON.

## Learned Workspace Facts

- Design source of truth for hub-web is `web/DESIGN.md`, `web/PRODUCT.md`, and local `web/.impeccable/` (gitignored agent/design tooling—not committed).
- Personal skills vault lives at `/Users/silverfox/www/skills` (shared design skill lives there; not vendored under `.claude/skills/` in this repo).
- Cross-IDE rules direction: one hub-owned SSOT with global and project-scoped rules, projected/synced into each editor's native rules format (Cursor, Claude Code, Windsurf, Devin) plus marked-section AGENTS.md merges (Zed config, `~/.codex/AGENTS.md` via the codex adapter) rather than separate per-IDE rule trees. The shared merge helper lives in `adapters/agents-md.ts` (`chain-hub:rules` block, user content preserved).
- Chain Hub is the skills control plane: install/manage once in Hub, project into editors via adapters; do not maintain parallel Claude/Cursor skill inventories for Hub-managed skills (`../notes/docs/intent/hub-skills-control-plane.md`, `../notes/docs/specs/hub-skill-install.md`).
- External `npx skills add` / `~/.agents` installs are imported into Hub on `chain hub` / `chain setup` start (no force overwrite), with remaining agents↔Hub drift surfaced on Overview/Library. The `agent-skills` adapter owns `~/.agents/skills/` — the open-standard dir read by Codex, Copilot, Gemini CLI, Zed, Junie, Roo — and is installed whenever that dir or a consumer config (`~/.codex`, `~/.copilot`, `~/.gemini`, Zed config) exists. Zed's adapter is rules-only (AGENTS.md merge); skills require a non-empty description (multiline YAML block scalars must parse correctly on project).
- Discover lists only editor candidates whose `kind/name` is not already in the hub inventory (in addition to skipping Chain-Hub-managed editor files).
- Two Devin-family adapters: `windsurf` keeps legacy paths only (skills → `~/.codeium/windsurf/skills/`, rules/workflows → `~/.windsurf/{rules,workflows}/`); `devin` ("Devin CLI") owns the Devin generation (skills → `~/.config/devin/skills/`, agents → `~/.config/devin/agents/` as subagent profiles, rules/workflows → `~/.devin/{rules,workflows}/` shared with Devin Desktop; workflows also project as `triggers: [user]` skills into `~/.config/devin/skills/` for `/name` invocation). Devin installed = `~/.config/devin` (`%APPDATA%\devin` on Windows) or `~/.devin` exists.
- Hub AI settings live under `/settings`: provider/model config in `~/.chain-hub/system/ai-config.json`, API keys in `~/.chain-hub/system/secrets.json`. Providers are listed in `aiProviders` (`packages/contracts/src/ai.ts`): Anthropic, OpenAI, Mistral, Ollama, Gemini, Groq, OpenRouter, DeepSeek, Cerebras. AI endpoints: `POST /api/ai/draft-prompt`, `/api/ai/classify-asset`, `/api/ai/audit-asset`, `/api/ai/improve-asset`.
- Learnings have a hub-web page at `/learnings` (primary nav) backed by `/api/learnings`; capture/reflect also via CLI. `chain reflect --apply` / `POST /api/learnings/fold` folds open reports into skills (AI audit+improve → write editable skills, contribution artifact for upstream-locked, orphans stay open); `--dry-run` previews, `--to-source` writes back into path sources.
- Skill update checks: `check-updates` probes git remotes (`git ls-remote` HEAD) and persists `latestSha`/`lastCheckedAt` in `skills-lock.json`; `hasSkillUpdate(entry)` derives the flag. Probes are cached for `SKILL_UPDATE_CHECK_TTL_MS` (15 min, `force` bypasses). `chain hub` runs the check in the background at start; Library badges/Update-button read it on the skills tab.
- `@chain-hub/*` packages deliberately keep plain semver deps (no `catalog:`): it keeps the product self-contained and publishable to npm (a `catalog:` specifier can't be published), preserving the OSS-extraction path.
