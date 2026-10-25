# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is an individual developer managing their own personal Chain Hub — one person, one local hub. Their core job when opening this dashboard: inspect what's in their hub (skills, agents, workflows, rules), keep it in sync across the AI coding editors they use, and fix anything that's drifted or missing.

Team/shared-hub usage exists in the broader product roadmap (see repo-level `notes/REBUILD_STRATEGY.md` (private notes clone)) but is not the design target for this surface today — solo, individual use comes first.

## Product Purpose

Chain Hub's dashboard (`apps/hub-web`) is the visual control plane for a local-first AI workspace. It lets a developer initialize a local hub, browse and edit reusable AI guidance, validate the hub's structure, and connect/inspect editor integrations — all from one calm, sequential interface rather than scattered per-editor config files.

Success means: the user can tell at a glance whether their hub is healthy, what's synced where, and can make a change in one place and trust it reaches every editor they use.

## Positioning

One local source of truth, synced automatically to the native format of every linked editor. The user authors a skill/agent/rule/workflow once in the hub; Chain Hub's editor adapters translate and write it out in each editor's own convention (e.g. `.claude/skills/*/SKILL.md`, `.cursor/rules/*.mdc`, Zed's merged `AGENTS.md`) — instead of the user hand-maintaining separate, drifting config files per editor.

A companion Discover/Import flow finds assets that already exist natively in a linked editor but aren't yet hub-managed, and lets the user adopt them into the hub without losing them or duplicating effort.

## Operating Context

- Runs entirely on the user's own machine: a local Hono API server (default port 2342) plus this Vite/React dashboard, started via the `chain hub` CLI command or `bun run dev` / `bun run dev:hub`.
- The hub folder (default `~/.chain-hub`, overridable via `CHAIN_HOME`) is the on-disk source of truth: SQLite metadata index + Markdown/YAML asset files.
- Linked editors today: Claude Code, Cursor, Windsurf (rebranded Devin Desktop), and Zed — each with different native storage conventions the dashboard's Integrations page surfaces per-editor (supported vs. unsupported asset kinds, connection status).
- Part of a Bun + Turborepo monorepo (`packages/{cli,server,domain,storage,contracts}` + `apps/hub-web`); the dashboard only talks to the local `/api/*` HTTP surface, never directly to storage.
- A user may already have an existing, separate Chain Hub installation (the current published product) with a large real asset library (skills, agents, workflows, rules) that predates this rebuild and uses a different on-disk format — the Discover/Import flow is one deliberate bridge between the two, not an automatic migration.

## Capabilities and Constraints

- Four asset kinds: skills, agents, workflows, rules — full CRUD via the Library page, backed by `/api/library`.
- Discover/Import: `/api/library/discover` + `/api/library/import` surface native, not-yet-hub-managed editor content for one-click adoption.
- Integrations page: per-editor connection status, and which of the four asset kinds each editor actually supports natively (e.g. Cursor has no native "agents" concept; Zed only supports one merged rules file).
- Learnings page: capture/timeline/reflect view over a JSONL event log (success/failure/correction/note).
- Setup page: sequential guided checklist (initialize → create first asset → connect editors → validate). Reachable from Settings, Overview (when incomplete), and the command palette — not a primary sidebar destination.
- Hard constraint: **local-first, no cloud or hosted component** — everything the dashboard shows and does must be explainable as "this is what's on disk / reachable on localhost right now."
- Undecided / explicitly out of scope for this surface: multi-user or team-shared hub UX (tracked at the product-roadmap level, not designed here yet).

## Brand Commitments

Name: **Chain Hub**. Existing wordmark/monogram in the app shell: an outlined orange "CH" mark paired with a Big Shoulders Display "CHAIN HUB" title (matches marketing titleblock). No other product name or rebrand is in play for this surface.

## Evidence on Hand

This is a real, currently-used personal instance, not a demo shell: during recent work the user's own Claude Code assets (agents, skills, rules, workflows — tens of real items) were imported into this hub via the Discover flow. Future design work can assume the Library/Overview will realistically hold dozens of real, varied-length assets, not just a handful of short placeholder rows.

No fabricated testimonials, customer names, benchmarks, or pricing exist for this surface and none should be invented.

## Product Principles

1. **Local-first, always.** No cloud dependency, no hosted account — the hub folder on disk is the only source of truth.
2. **One hub, every editor.** Author once; syncing to each editor's native format is the dashboard's job, not the user's.
3. **Editor-agnostic by design.** No single linked editor is privileged; new editors are added as adapters, not special-cased exceptions.
4. **Solo-developer-first.** Designed around one person's daily, repeated use — not team coordination or multi-seat permissions (that's later-phase, separate scope).
5. **Sequential before dense.** Setup and health-checking stay calm and step-by-step; deep asset management is available but never forced in front of a first-time or at-a-glance view.
