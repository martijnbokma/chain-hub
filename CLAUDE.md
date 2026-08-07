# Chain Hub v2 — Agent Rules and Project Context

## Project Overview

**Chain Hub v2** is a local-first AI workspace control plane that provides:
- One hub folder (`~/.chain-hub`) as single source of truth
- One CLI (`chain`) for management
- One dashboard for visual control
- Multi-editor support (Cursor, Claude Code, Windsurf, Zed)

**Core Philosophy**: Local-first, editor-agnostic, minimal surface, grows deliberately.

---

## Tech Stack

### Workspace
- **Package Manager**: Bun 1.3.11 with workspaces
- **Monorepo**: Turborepo for task orchestration
- **TypeScript**: 5.5.4+ (packages), 6.0.3+ (hub-web)
- **Node**: 22.0.0+ (ESM modules)

### Backend Stack
- **CLI**: Commander 12.1.0
- **Server**: Hono 4.5.8 + @hono/node-server 1.13.1
- **Build**: tsup 8.2.4 (packages)
- **Validation**: Zod (shared across all packages)
- **Storage**: SQLite via node:sqlite + drizzle-orm

### Frontend Stack
- **Framework**: React 19.2.7 + React Router 7.18.1
- **State**: TanStack Query 5.101.2
- **Styling**: Tailwind CSS 4.3.2 + shadcn/ui primitives
- **Utilities**: class-variance-authority, clsx, tailwind-merge
- **UI**: cmdk 1.1.1 (command palette), lucide-react 1.23.0 (icons), sonner 2.0.7 (toasts)
- **Build**: Vite 8.1.3 + @vitejs/plugin-react 6.0.3

---

## Project Architecture

```
chain-hub-v2/
├── apps/
│   └── hub-web/           # React dashboard (Vite + Tailwind v4 + shadcn/ui)
├── packages/
│   ├── cli/               # chain binary entrypoint (Commander)
│   ├── server/            # Hono localhost API server
│   ├── domain/            # Business logic and use-cases
│   ├── storage/           # SQLite + filesystem adapters
│   ├── contracts/         # Shared Zod schemas and TypeScript types
│   └── config/            # Shared tsconfig/eslint presets
├── docs/                 # Architecture, analysis, product docs
└── scripts/              # Utility scripts
```

### Domain Boundaries
- **domain**: Asset lifecycle, validation rules, editor sync logic, learning workflows
- **storage**: SQLite metadata, YAML/Markdown file I/O, filesystem operations
- **server**: Maps domain use-cases to HTTP routes (Hono)
- **cli**: Maps domain use-cases to terminal commands (Commander)
- **hub-web**: Consumes contracts and API endpoints only (no direct domain/storage access)

---

## Commands

### Workspace
- `bun install` — Install all dependencies
- `bun run build` — Build all packages in dependency order
- `bun run dev` — Hub stack in watch mode (server + hub-web + packages)
- `bun run dev:hub` — Server + hub-web only (fastest dashboard loop)
- `bun run dev:all` — All packages including marketing-site and CLI
- `bun run dev:marketing` — Marketing site only
- `bun run hub` — Build + start dashboard (production mode)
- `bun run lint` — Run ESLint across workspace
- `bun run typecheck` — Type check all packages
- `bun run test` — Run all tests

### CLI (chain binary)
- `chain init` — Initialize hub structure
- `chain status` — JSON overview of hub state
- `chain validate` — Check structural integrity
- `chain setup` — Create editor symlinks
- `chain guide` — Show setup checklist
- `chain hub [--port N] [--no-open]` — Start local dashboard (port 2342 default)

### Asset Management
- `chain asset list [--kind <kind>]`
- `chain asset create --kind <kind> --name <name> --content <text>`
- `chain asset show --kind <kind> --name <name>`
- `chain asset update --kind <kind> --name <name> --content <text>`
- `chain asset remove --kind <kind> --name <name>`

Asset kinds: `skills` · `agents` · `workflows` · `rules`

### Learnings
- `chain capture --event <type> --skill <slug> --summary "<text>"` (types: success, failure, correction, note)
- `chain reflect` — Per-skill reflection report
- `chain reflect --write` — Write reflection to file
- `chain reflect --json` — Raw JSON output

---

## Code Conventions

### General Rules
1. **Always prefer existing patterns** — If a similar file/type/function exists, follow its structure
2. **Use Zod for all validation** — Shared schemas in `@chain-hub/contracts`
3. **TypeScript strict mode** — Always enabled, no `any` types
4. **ESM modules** — All files use `import/export`, never `require`
5. **Named exports** — Prefer named exports over default exports

### Frontend Specific
1. **ALWAYS use shadcn/ui components** — Never build buttons, inputs, dialogs, or dropdowns from scratch
2. **Styling via Tailwind tokens only**: `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, etc.
3. **Never use loose hex codes** — Always use Tailwind semantic tokens
4. **Never use arbitrary px values** — Use Tailwind spacing scale (1, 2, 3, 4, 6, 8, 10, 12, 16, etc.)
5. **Component variants via cva** — Use class-variance-authority for variant handling
6. **Class combining via cn()** — Always use `cn()` (clsx + tailwind-merge) for conditional classes
7. **Icons from lucide-react only** — No other icon libraries
8. **Toasts via sonner** — Use sonner for all user feedback
9. **Spacing follows 4px scale** — Use Tailwind steps: 1(4px), 2(8px), 3(12px), 4(16px), 6(24px), 8(32px)

### Backend Specific
1. **Hono routes** — Follow existing route patterns in `packages/server/src`
2. **Commander commands** — Follow existing command patterns in `packages/cli/src`
3. **Storage via adapters** — Use storage package abstractions, never direct SQLite
4. **Error handling** — Use custom error classes, not raw throws

### Testing
1. **Vitest** for unit tests (packages/server, packages/storage, packages/domain)
2. **Testing Library** for component tests (apps/hub-web)
3. **Playwright** for e2e tests
4. **Colocate tests** — `__tests__` folder or `.test.ts` alongside source files

### File Organization
- **Components**: PascalCase names, `.tsx` extension
- **Utilities**: kebab-case names, `.ts` extension
- **Types**: PascalCase, `.d.ts` or in `types/` folder
- **Routes**: kebab-case, in `routes/` folder
- **Hooks**: `use*` prefix, in `hooks/` folder

---

## Boundaries and Constraints

### NEVER Do
- ❌ Commit `.env` files or any secrets
- ❌ Add dependencies without checking impact on bundle size
- ❌ Modify database schema without migration plan
- ❌ Bypass storage package for direct SQLite access
- ❌ Create new UI components from scratch (use shadcn/ui)
- ❌ Use arbitrary values for spacing, colors, or typography
- ❌ Add legacy Pro/licensing code to core packages
- ❌ Mix product domains (CLI, server, domain, storage stay separate)

### ALWAYS Do
- ✅ Run `bun run typecheck` before committing
- ✅ Run `bun run lint` before committing
- ✅ Add tests for new functionality
- ✅ Update contracts (Zod schemas) when changing APIs
- ✅ Use existing type definitions before creating new ones
- ✅ Follow the architecture boundaries defined above
- ✅ Ask for clarification when requirements are ambiguous

---

## Hub Folder Structure

The hub lives at `~/.chain-hub/` by default (override with `CHAIN_HOME`):

```
~/.chain-hub/
├── skills/              # SKILL.md files
├── agents/              # Agent persona files
├── workflows/           # Workflow .md files
├── rules/               # Rule files
├── memory/              # Markdown notes + learnings
│   ├── learnings/
│   │   └── events.jsonl # Append-only capture log
│   └── reflections/     # Written reflection snapshots
├── system/              # Metadata
│   ├── chainhub.sqlite  # SQLite metadata index
│   └── meta.json        # Initialization metadata
└── logs/                # Application logs
```

---

## API Contracts

### Shared Types
All shared types and Zod schemas live in `@chain-hub/contracts`. Key schemas:
- `AssetSchema` — Validates skills, agents, workflows, rules
- `LearningEventSchema` — Validates capture events
- `ValidationResultSchema` — Validates hub health checks

### API Routes
All routes are defined in `packages/server/src/routes/`. The dashboard API runs on the same port as the hub server.

Primary route groups:
- `/api/overview` — Hub health, counts, storage stats
- `/api/library` — Asset CRUD operations
- `/api/memory` — Note management and search
- `/api/learnings` — Timeline and reflection
- `/api/setup` — Guided setup
- `/api/integrations` — Editor integration status
- `/api/validate` — Validation results

---

## UX Direction

**Target feel**: Raycast + Linear — keyboard-first, fast, dense information, minimal chrome, subtle borders.

### Design Principles
- Light, quiet, editorial aesthetic ("Cool Trust": zinc neutrals, single orange signal accent — see `apps/hub-web/.impeccable/design.json`)
- Minimal chrome, sharp hierarchy
- Compact chips and segmented controls
- No decorative overload
- Left-aligned layouts
- Strong grouping, progressive disclosure

### Interaction Patterns
- **Cmd/Ctrl + K** — Global command palette (navigation, asset creation, capture, connections)
- **Wizard-like** — Setup and repair flows
- **Dashboard-like** — Inspection and state management
- **One primary action per screen** — Clear, focused UX
- **Dense information** — Only after context is established

### Component Guidelines
- Use shadcn/ui primitives exclusively
- Strong visual hierarchy
- Command surfaces feel reliable, not flashy
- Progressive disclosure over large menus

---

## Workflow Rules for Agents

### Before Starting Any Task
1. **Read this CLAUDE.md file** — Always load project rules first
2. **Read the REBUILD_STRATEGY.md** — Understand product direction
3. **Read the relevant source files** — Never edit without reading first
4. **Find existing patterns** — Search for similar implementations
5. **Ask for clarification** — If requirements are ambiguous or conflicting

### During Development
1. **Follow the architecture boundaries** — Don't bypass package separation
2. **Use existing utilities** — Don't reimplement what's already there
3. **Write tests** — All new functionality needs corresponding tests
4. **Update contracts first** — If changing APIs, update Zod schemas first
5. **Verify types** — Run typecheck frequently during development

### Before Delivering
1. **Run `bun run typecheck`** — Must pass
2. **Run `bun run lint`** — Must pass  
3. **Run relevant tests** — Must pass
4. **Verify the change** — Manually test when possible
5. **Document the change** — Add comments, update docs if needed

---

## Context Loading Strategy

### Level 1: Always Load (This file)
- CLAUDE.md — Project rules, stack, conventions, boundaries

### Level 2: Per Session/Feature
- REBUILD_STRATEGY.md — Product architecture and direction
- PROJECT_MAP.md — Hierarchical navigation of codebase
- Relevant section of README.md

### Level 3: Per Task
- Specific source files being modified
- Related test files
- Example files showing the pattern to follow
- Type definitions involved

### Level 4: Per Iteration
- Error output from tests/builds
- Type checking errors
- Lint warnings

---

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Solution |
|---|---|---|
| Context starvation | Agent invents APIs, ignores conventions | Always load CLAUDE.md + relevant source files |
| Context flooding | Agent loses focus with too much info | Include only relevant files (<2000 lines) |
| Stale context | Agent references old/deleted code | Start fresh sessions for major feature switches |
| Missing examples | Agent invents new style | Always point to existing pattern file |
| Implicit knowledge | Agent doesn't know project rules | Write everything down in CLAUDE.md |
| Silent confusion | Agent guesses instead of asking | Surface ambiguity explicitly |

---

## Common Pitfalls

1. **Dependencies**: Bun workspaces can be tricky — always check `package.json` workspaces config
2. **ESM/CJS**: All packages are ESM — use `import/export`, handle `__dirname` with `import.meta.url`
3. **TypeScript**: Different versions in packages (5.x vs 6.x) — check each package's tsconfig
4. **Tailwind v4**: Uses `@theme` tokens, not tailwind.config.js — styling is different from v3
5. **Hono**: Fast but minimal — understand middleware and route patterns before extending

---

## When to Ask for Help

**Stop and ask when:**
- Requirements are ambiguous or conflicting
- You need to modify database schema
- You're unsure about architecture boundaries
- Existing code doesn't match the documented patterns
- You're about to add a new dependency
- You're changing a public API contract
- You're unsure about UX direction

**Provide when asking:**
- The specific file/line you're unsure about
- The relevant context from this CLAUDE.md
- What you've already tried
- What outcome you expect

---

## Verification Checklist

After setting up or working with this project, verify:

- [ ] CLAUDE.md exists and is comprehensive
- [ ] Agent output follows patterns in this file
- [ ] Agent references actual project files (not hallucinated)
- [ ] Context is refreshed when switching major tasks
- [ ] Architecture boundaries are respected
- [ ] All commands in CLAUDE.md are accurate
- [ ] No contradictions between CLAUDE.md and REBUILD_STRATEGY.md