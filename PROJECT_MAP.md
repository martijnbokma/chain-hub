# Chain Hub v2 — Project Map

> **Navigation Guide**: Hierarchical overview of the Chain Hub v2 codebase for efficient context loading.

This document provides a **selective index** of the codebase. Use it to quickly locate relevant files for specific tasks without loading unnecessary context.

---

## 🗺️ Architecture Overview

```text
chain-hub-v2/
├── apps/
│   ├── hub-web/           # React Dashboard (Vite + Tailwind v4 + shadcn/ui)
│   └── marketing-site/    # Marketing site (under development)
├── packages/
│   ├── cli/               # CLI entrypoint (Commander)
│   ├── server/            # Hono API server
│   ├── domain/            # Business logic & use-cases
│   ├── storage/           # SQLite + filesystem adapters
│   └── contracts/         # Shared Zod schemas & types
└── docs/                  # Specs, intent, research, archived journey docs
```

---

## 📁 Package Index

### `@chain-hub/cli` — Command Line Interface

**Purpose**: Primary user interface for hub management via terminal.

**Entry Point**: `packages/cli/src/index.ts` → `chain` binary

**Key Files**:
- `src/index.ts` — CLI entrypoint, command registration
- `dist/index.js` — Built binary output

**Commands**:
- `chain init` — Initialize hub structure
- `chain status` — Hub state overview
- `chain validate` — Structural validation
- `chain setup` — Editor integration setup
- `chain guide` — Setup checklist
- `chain hub` — Start dashboard server
- `chain asset *` — Asset management (list, create, show, update, remove)
- `chain capture` — Learning event capture
- `chain reflect` — Reflection generation

**Dependencies**: contracts, domain, server, storage

---

### `@chain-hub/server` — HTTP API Server

**Purpose**: Local HTTP API for dashboard and external integrations.

**Entry Point**: `packages/server/src/index.ts` → Hono app

**Key Files**:
- `src/index.ts` — Hono app initialization, route registration
- `src/dev-server.ts` — Development server with hot reload
- `dist/index.js` — Built server output

**API Route Groups**:
- `/api/overview` — Hub health, counts, storage stats
- `/api/library` — Asset CRUD operations
- `/api/memory` — Note management and search (CLI/API; no hub-web page)
- `/api/learnings` — Timeline and reflection data (CLI/API; no hub-web page)
- `/api/setup` — Guided setup endpoints
- `/api/integrations` — Editor connection status
- `/api/validate` — Validation results
- `/api/settings/ai` — Local-first AI provider settings
- `/api/ai/draft-prompt` — Prompt/asset drafting

**Framework**: Hono 4.5.8 + @hono/node-server 1.13.1

**Dependencies**: contracts, domain, storage

---

### `@chain-hub/domain` — Business Logic Layer

**Purpose**: Core business rules, use-cases, and workflows.

**Entry Point**: `packages/domain/src/index.ts`

**Responsibilities**:
- Asset lifecycle management (skills, agents, workflows, rules)
- Validation rules and logic
- Editor sync logic and coordination
- Learning workflows and reflection
- Hub initialization and management

**Pattern**: Pure business logic, no I/O or framework dependencies.

**Dependencies**: contracts, storage

---

### `@chain-hub/storage` — Persistence Layer

**Purpose**: Data access and persistence abstractions.

**Entry Point**: `packages/storage/src/index.ts`

**Responsibilities**:
- SQLite database operations (via node:sqlite + drizzle-orm)
- YAML file I/O for assets
- Markdown file I/O for memory/notes
- Filesystem operations
- FTS5 full-text search for notes

**Adapters**:
- SQLite adapter for metadata
- Filesystem adapter for assets and notes
- Search adapter for full-text queries

**Dependencies**: contracts

---

### `@chain-hub/contracts` — Shared Types & Schemas

**Purpose**: Single source of truth for all shared types and validation.

**Entry Point**: `packages/contracts/src/index.ts`

**Key Schemas**:
- `AssetSchema` — Validates all asset kinds (skills, agents, workflows, rules)
- `LearningEventSchema` — Validates capture events (success, failure, correction, note)
- `ValidationResultSchema` — Validates hub health checks
- `IntegrationSchema` — Validates editor connections
- `SetupStepSchema` — Validates guided setup progress

**Pattern**: Zod schemas with TypeScript type extraction. All packages import from here.

**Dependencies**: None (foundation package)

---

### `@chain-hub/hub-web` — Dashboard Application

**Purpose**: Visual control plane for hub management.

**Entry Point**: `apps/hub-web/src/main.tsx`

**Framework**: React 19 + React Router 7 + TanStack Query 5

---

## 🏗️ Hub-Web Structure

### `apps/hub-web/`

```text
hub-web/
├── src/
│   ├── main.tsx            # App entrypoint, ReactDOM render
│   ├── app.tsx             # Router configuration, providers
│   │
│   ├── components/
│   │   ├── ui/             # shadcn/ui primitives (Button, Input, Dialog, etc.)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── command.tsx
│   │   ├── ui/             # shadcn/ui primitives (in use)
│   │   │   ├── alert.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── command.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── …
│   │   │   └── tooltip.tsx
│   │   │
│   │   ├── layout/         # Shell + command palette
│   │   │   ├── Shell.tsx
│   │   │   ├── ShellToolbar.tsx
│   │   │   └── useCommandPalette.ts
│   │   │
│   │   ├── common/         # Shared reusable components
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Eyebrow.tsx
│   │   │   ├── MarkdownSourceEditor.tsx
│   │   │   ├── PageSkeleton.tsx
│   │   │   └── ThemeToggle.tsx
│   │   │
│   │   └── pages/          # Page components (route-level)
│   │       ├── OverviewPage.tsx
│   │       ├── LibraryPage.tsx
│   │       ├── IntegrationsPage.tsx
│   │       ├── SetupPage.tsx
│   │       ├── SettingsPage.tsx
│   │       └── library/    # Library master–detail + dialogs
│   │
│   ├── types/              # TypeScript type definitions
│   │   ├── index.ts
│   │   ├── assets.ts
│   │   ├── overview.ts
│   │   ├── ai.ts
│   │   ├── setup.ts
│   │   └── integrations.ts
│   │
│   ├── hooks/              # React hooks
│   │   ├── use-mobile.ts
│   │   └── use-theme.ts
│   │
│   └── lib/                # Utilities and configurations
│       ├── api.ts
│       ├── constants.ts
│       ├── theme.ts
│       └── utils.ts
│
├── vite.config.ts
├── components.json        # shadcn/ui configuration
├── package.json
└── tsconfig.json
```

---

## 🎯 Navigation Structure (Dashboard)

### Primary Navigation

1. **Setup** (`/setup`)
   - Guided checklist
   - Step-by-step initialization
   - Progress tracking
   - Validation feedback

2. **Overview** (`/`)
   - Hub health
   - Asset counts / storage
   - Validation status
   - Recommended next action

3. **Library** (`/library`)
   - Asset browser (skills, agents, workflows, rules, prompts)
   - Search and filtering
   - Create/edit/delete assets
   - Asset detail view

4. **Integrations** (`/integrations`)
   - Connected editors list
   - Health check status
   - Sync actions

5. **Settings** (`/settings`)
   - Theme preference
   - Local-first AI providers (BYOK / Ollama)

Memory notes and learnings are CLI/API surfaces today (`chain capture` / `chain reflect`, `/api/memory`, `/api/learnings`) — not dashboard routes.

---

## 🔗 Cross-Cutting Concerns

### Command Palette (Cmd/Ctrl + K)

**Purpose**: Global navigation and action execution.

**Actions**:
- Navigate to any page
- Create new assets (skills, agents, workflows, rules)
- Capture learning events
- Connect editors
- Run validation
- Search documentation

**Component**: `apps/hub-web/src/components/ui/command.tsx`

---

### API Client

**Purpose**: Centralized HTTP communication with server.

**Location**: `apps/hub-web/src/lib/api-client.ts`

**Hook**: `apps/hub-web/src/hooks/use-api.ts`

**Pattern**: TanStack Query for caching, React Query for mutations.

---

### Toast Notifications

**Purpose**: User feedback and notifications.

**Library**: Sonner 2.0.7

**Hook**: `apps/hub-web/src/hooks/use-toast.ts`

---

## 📋 Domain-Specific Index

### Asset Management

**Core Files**:
- Contracts: `packages/contracts/src/schemas/asset.ts`
- Domain: Asset service in `packages/domain/src/`
- Storage: Asset adapter in `packages/storage/src/`
- Server: Library routes in `packages/server/src/`
- CLI: Asset commands in `packages/cli/src/`
- UI: Library page and AssetCard component in `apps/hub-web/src/`

**Asset Kinds**: skills, agents, workflows, rules (extensible)

---

### Learning & Reflection System

**Core Files**:
- Contracts: `packages/contracts/src/schemas/learning.ts`
- Domain: Learning service in `packages/domain/src/`
- Storage: Learning adapter in `packages/storage/src/`
- Server: Learnings routes in `packages/server/src/`
- CLI: capture and reflect commands in `packages/cli/src/`
- UI: no hub-web Learnings page (CLI/API only)

**Event Types**: success, failure, correction, note

---

### Editor Integration

**Core Files**:
- Contracts: `packages/contracts/src/schemas/integration.ts`
- Domain: Integration service in `packages/domain/src/`
- Storage: Integration adapter in `packages/storage/src/`
- Server: Integrations routes in `packages/server/src/`
- CLI: setup command in `packages/cli/src/`
- UI: Integrations page in `apps/hub-web/src/`

**Supported Editors**: Cursor, Claude Code, Windsurf, Zed

---

### Hub Management

**Core Files**:
- Domain: Hub service in `packages/domain/src/`
- Storage: Hub adapter in `packages/storage/src/`
- Server: Overview routes in `packages/server/src/`
- CLI: init, status, validate commands in `packages/cli/src/`
- UI: Overview page in `apps/hub-web/src/`

---

## 🎨 UI Component Index

### shadcn/ui Primitives (Customized)

All UI components are built on shadcn/ui + Radix UI:

- **Button** — Actions, CTA
- **Card** — Content grouping
- **Input** — Text input
- **Dialog** — Modal overlays
- **Sheet** — Slide-out panels
- **Tooltip** — Hover information
- **Command** — Command palette
- **Badge** — Status indicators
- **Avatar** — User/agent avatars
- **Breadcrumb** — Navigation context
- **ScrollArea** — Scrollable containers
- **Tabs** — Tabbed interfaces

**Pattern**: Always use these instead of building custom components.

---

## 🔍 Pattern Locations

### Common Patterns by Use Case

| Use Case | Example Location |
|---|---|
| **Form validation** | `apps/hub-web/src/hooks/use-form.ts` (when created) |
| **API client usage** | `apps/hub-web/src/hooks/use-api.ts` |
| **Zod schema definition** | `packages/contracts/src/schemas/*.ts` |
| **Hono route definition** | `packages/server/src/index.ts` |
| **Commander command** | `packages/cli/src/index.ts` |
| **Storage adapter** | `packages/storage/src/index.ts` |
| **Domain service** | `packages/domain/src/index.ts` |
| **Page layout** | `apps/hub-web/src/components/layout/PageLayout.tsx` |
| **UI component** | `apps/hub-web/src/components/ui/*.tsx` |

---

## 🚀 Quick Navigation Commands

### Find Files by Pattern

```bash
# Find all asset-related files
rg -l "asset" packages/ apps/

# Find all API routes
rg -l "api/" packages/server/src/

# Find all Zod schemas
rg -l "z\." packages/contracts/src/

# Find all React components
find apps/hub-web/src -name "*.tsx"

# Find all hooks
find apps/hub-web/src/hooks -name "*.ts"

# Find all types
find apps/hub-web/src/types -name "*.ts"
```

---

## 📊 Context Size Guide

Use this map to estimate context size for different task types:

| Task Scope | Recommended Files | Estimated Lines |
|---|---|---|
| **Full feature** | CLAUDE.md + PROJECT_MAP.md + 6-8 source files | 2000-2500 |
| **Single page** | CLAUDE.md + 3-4 similar components + 1-2 utility files | 1500-2000 |
| **API endpoint** | CLAUDE.md + contracts + 2-3 route files + test | 1200-1800 |
| **CLI command** | CLAUDE.md + contracts + domain + storage + 1 route file | 1400-2000 |
| **UI component** | CLAUDE.md + 2-3 similar components + design tokens | 1000-1500 |
| **Bug fix** | CLAUDE.md + failing file + test + related dependencies | 800-1500 |

---

## 🔗 Related Documentation

- [CLAUDE.md](./CLAUDE.md) — Project rules and constraints
- [AI_CONTEXT.md](./AI_CONTEXT.md) — Context engineering framework
- [REBUILD_STRATEGY.md](./REBUILD_STRATEGY.md) — Product architecture and vision
- [README.md](./README.md) — Quickstart, commands, API reference

---

> **Usage Tip**: Bookmark this file. When starting a new task, first check PROJECT_MAP.md to locate the relevant files, then load only those files plus the required context levels from AI_CONTEXT.md.