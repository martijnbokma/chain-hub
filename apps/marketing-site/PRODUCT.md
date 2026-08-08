# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Solo developers and indie hackers who use multiple AI-assisted editors (Cursor, Claude Code, Windsurf, Zed) day to day and currently maintain separate, duplicated prompt/rule/skill files per editor. Single-user product — not built around team/org accounts.

## Product Purpose

Chain Hub is a local-first control plane for a developer's AI working context: skills, agents, workflows, rules, and memory. One hub folder (`~/.chain-hub`) is the single source of truth on disk; one CLI (`chain`) manages it; one local dashboard gives visual control. Success means a developer can define an AI behavior once and have it live correctly in every editor they use, with a dashboard that makes hub health and asset state legible at a glance.

## Positioning

One source of truth for every AI editor. The alternative today is copy-pasting the same rules/prompts/skills into `.cursorrules`, Claude Code project files, Windsurf config, etc. separately, with no shared history and no way to see drift. Chain Hub keeps one editable set of assets on disk and syncs them out, instead of each editor owning its own disconnected copy.

## Operating Context

- Runs entirely on the developer's machine; `CHAIN_HOME` overrides the default `~/.chain-hub` location.
- Primary workflows: `chain init` (set up hub), `chain setup` (link editors), `chain asset create/list/update` (manage skills/agents/workflows/rules/prompts), `chain hub` (open local dashboard on port 2342).
- The dashboard (hub-web) is a separate app in the same monorepo; this marketing site is pre-launch and does not yet link to a live signup backend.

## Capabilities and Constraints

- Not a hosted SaaS and not an AI model — a local system for organizing and syncing reusable AI behavior.
- Editor-agnostic by design: Cursor, Claude Code, Windsurf, Zed today.
- Memory/learnings (`chain capture`, `chain reflect`) are CLI/API-only in the current phase, not dashboard surfaces.
- No team/multi-user accounts in this phase (explicitly single-user hub).
- Undecided: exact GA launch date, pricing/licensing model, which additional editors ship next.

## Brand Commitments

- Name: **Chain Hub**.
- Visual identity ("Cool Trust", shared with the hub-web dashboard): near-white zinc surfaces / slate-toned dark mode, orange (`#f97316`) as the single brand accent. Minimal chrome, sharp hierarchy, no decorative overload.
- No existing logo mark or wordmark asset — type-based treatment only until one is designed.

## Evidence on Hand

- Real, working hub-web dashboard (Overview + Library screens) running locally in this repo — usable as genuine product screenshots.
- No customers, testimonials, press, or usage numbers yet (product is pre-launch / "coming soon").

## Product Principles

1. Local-first by default — no cloud dependency to use the product.
2. One clear source of truth on disk, not per-editor copies.
3. Editor-agnostic — the hub does not privilege one editor over another.
4. Calm, workflow-first UX over feature-dense UX (carries into marketing tone: confident and quiet, not hypey).
5. Show real product state (screenshots of the actual dashboard) rather than invented mockups or stock imagery.
