# Chain Hub — Project Map

Where things live, by feature area. Load only the section you need. Rules and conventions are in [AGENTS.md](./AGENTS.md).

## Packages

| Package | Entry | Key files |
|---|---|---|
| `@chain-hub/contracts` | `packages/contracts/src/index.ts` | `asset.ts` (asset kinds, skill name/path policy), `hub.ts` (overview, integrations, drift), `learning.ts`, `setup.ts`, `ai.ts` (providers, draft/classify/audit/improve), `frontmatter.ts` |
| `@chain-hub/storage` | `packages/storage/src/index.ts` | `core.ts` (hub init, SQLite index, asset CRUD), `assets.ts` + `skill-install.ts` (install/update/fork, skills lock), `integrations.ts` (editor sync, discover/import), `learnings.ts`, `hub.ts` (overview, setup guide), `ai-settings.ts`, `adapters/` (per-editor) |
| `@chain-hub/domain` | `packages/domain/src/index.ts` | `index.ts` (use-cases wrapping storage), `skills.ts`, `ai-providers.ts` (provider calls, `AiProviderError`) |
| `@chain-hub/server` | `packages/server/src/index.ts` | `routes/*.ts` (route registrars), `http-errors.ts`, `dev-server.ts`, `dev-port.ts` |
| `chain-hub` (CLI) | `packages/cli/src/index.ts` | All Commander commands in `index.ts`; `reflect-format.ts` |

## API routes (`packages/server/src/routes/`)

| File | Endpoints |
|---|---|
| `hub.ts` | `/api/overview`, `/api/setup`, `/api/validate`, `/api/integrations`, `/api/integrations/setup` |
| `library.ts` | `/api/library` (CRUD, `:kind/:name`, rename, convert), `/api/library/discover`, `/api/library/import`, `/api/library/skills/*` (install, install-bundle, update, fork, migrate-agents, files) |
| `learnings.ts` | `/api/learnings`, `/api/learnings/capture`, `/api/learnings/reflect` |
| `ai.ts` | `/api/settings/ai`, `/api/ai/draft-prompt`, `/api/ai/classify-asset`, `/api/ai/audit-asset`, `/api/ai/improve-asset` |

## Editor adapters (`packages/storage/src/adapters/`)

`claude-code.ts`, `cursor.ts`, `windsurf.ts` (also Devin targets), `zed.ts`. Shared: `types.ts`, `files.ts`, `frontmatter.ts`, `marker.ts` (Chain-Hub-managed file markers). Each has a colocated test.

## hub-web (`apps/hub-web/src/`)

- `main.tsx` → `app.tsx` (routes: `/`, `/library`, `/learnings`, `/integrations`, `/settings`, `/setup`)
- `components/pages/` — `OverviewPage`, `LibraryPage`, `LearningsPage`, `IntegrationsPage`, `SettingsPage`, `SetupPage`
- `components/pages/library/` — master–detail: `AssetList`, `AssetCard`, `AssetDetailPanel`, `LibraryToolbar`, dialogs (`CreateAssetDialog`, `DiscoverDialog`, `InstallSkillDialog`, `RemoveAssetDialog`, `AiEditPreviewDialog`, `SkillFilePreviewDialog`), flows (`use-library-create-flow.ts`, `use-library-install-flow.ts`), `asset-helpers.ts`
- `components/layout/` — `Shell.tsx` (sidebar nav), `ShellToolbar.tsx`, `useCommandPalette.ts` (⌘K)
- `components/common/` — `EmptyState`, `MarkdownSourceEditor`, `PageSkeleton`, `SheetMarks`, `ThemeToggle`
- `components/ui/` — shadcn primitives (alert, badge, button, card, collapsible, command, dialog, dropdown-menu, input, select, separator, sheet, sidebar, skeleton, tabs, textarea, tooltip) + prompt-kit (`prompt-input`, `prompt-suggestion`, `loader`)
- `lib/` — `api.ts` (typed fetch helpers for TanStack Query), `ai-models.ts`, `skill-ownership.ts`, `theme.ts`, `constants.ts`, `utils.ts` (`cn`)
- `hooks/` — `use-theme.ts`, `use-mobile.ts`
- `types/` — view types per area (assets, ai, discover, integrations, learnings, overview, setup)
- `e2e/` — Playwright specs (create, discover, install, rename/delete, setup wizard)
- Design: `apps/hub-web/DESIGN.md`, `apps/hub-web/PRODUCT.md`

## Feature → files

| Feature | Files |
|---|---|
| Asset CRUD | `contracts/src/asset.ts` → `storage/src/core.ts` → `domain/src/index.ts` → `server/src/routes/library.ts` → `hub-web/.../library/` |
| Skill install/update/fork | `storage/src/skill-install.ts`, `storage/src/assets.ts`, `domain/src/skills.ts`, `routes/library.ts`, `InstallSkillDialog.tsx`; spec: `docs/specs/hub-skill-install.md` |
| Editor sync / discover | `storage/src/integrations.ts`, `storage/src/adapters/`, `routes/hub.ts`, `routes/library.ts` (discover/import) |
| Learnings | `contracts/src/learning.ts`, `storage/src/learnings.ts`, `routes/learnings.ts`, `LearningsPage.tsx`, CLI `capture`/`reflect` |
| AI drafting/audit | `contracts/src/ai.ts`, `storage/src/ai-settings.ts`, `domain/src/ai-providers.ts`, `routes/ai.ts`, `lib/ai-models.ts`, `AiEditPreviewDialog.tsx` |
| Overview / setup | `storage/src/hub.ts`, `routes/hub.ts`, `OverviewPage.tsx`, `SetupPage.tsx` |
