# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Solo developers and indie hackers who use multiple AI-assisted editors (Cursor, Claude Code, Windsurf, Zed, Google Antigravity, Devin CLI) day to day and currently maintain separate, duplicated prompt/rule/skill files per editor. Single-user product — not built around team/org accounts.

## Product Purpose

Chain Hub is a local-first control plane for a developer's AI working context: skills, agents, workflows, rules, prompts, and learnings. One hub folder (`~/.chain-hub`) is the single source of truth on disk; one CLI (`chain`) manages it; one local dashboard gives visual control. Success means a developer can define an AI behavior once and have it live correctly in every editor they use, with a dashboard that makes hub health and asset state legible at a glance.

## Positioning

One source of truth for every AI editor. The alternative today is copy-pasting the same rules/prompts/skills into `.cursorrules`, Claude Code project files, Windsurf config, etc. separately, with no shared history and no way to see drift. Chain Hub keeps one editable set of assets on disk and projects them out, instead of each editor owning its own disconnected copy.

## Operating Context

- Runs entirely on the developer's machine; `CHAIN_HOME` overrides the default `~/.chain-hub` location.
- Free and open source (MIT), distributed via npm: `npm install -g chain-hub` — currently `chain-hub@1.0.0` published under the `beta` dist-tag. Requires Node.js ≥ 22.13.
- Primary workflows: `chain init` (set up hub), `chain setup` (link editors), `chain asset create/list/update` (manage skills/agents/workflows/rules/prompts), `chain sync` (back up the hub to a private GitHub repo), `chain hub` (open local dashboard on port 2342).
- The dashboard (hub-web), docs site, and this marketing site live in the same monorepo; the marketing site links to the docs app (`/docs/...` paths) and the public repo `martijnbokma/chain-hub`.

## Capabilities and Constraints

- Not a hosted SaaS and not an AI model — a local system for organizing and syncing reusable AI behavior.
- Five asset kinds: skills, agents, workflows, rules, prompts. Learnings is a separate memory system — an append-only capture log (`chain capture`, `chain reflect`, `chain resolve`) with a dashboard page at `/learnings` — not an asset kind.
- Editor-agnostic by design: adapters ship for Cursor, Claude Code, Windsurf, Zed, Google Antigravity, and Devin CLI.
- `chain sync` versions and backs up the whole hub to a user-owned private GitHub repo; it syncs when the dashboard starts and merge conflicts resolve in the dashboard, not the terminal. This is what carries the hub between machines.
- Skill supply chain: a curated catalog (browse/install/refresh) plus upstream installs from git/path/upload; `chain skill install | fork | check-updates` track upstream sources in `skills-lock.json`, which also drives Editable vs Upstream ownership. External `npx skills add` / `~/.agents` installs are discovered and imported without force-overwriting.
- Hub AI is optional and off by default: the user configures their own provider (Anthropic, OpenAI, Mistral, Ollama, Gemini, Groq, OpenRouter, DeepSeek, Cerebras) in Settings; API keys stay in `~/.chain-hub/system/secrets.json` on the machine. Capabilities: draft any asset kind from a short description (with kind suggestion when the intent is ambiguous), reassess/convert an asset's kind, per-asset audit with severity findings, and improve from audit. There is no Chain cloud, and everything else works without AI.
- No team/multi-user accounts in this phase (explicitly single-user hub).
- Undecided: GA timing beyond the current npm beta; which additional editors ship next.

## Brand Commitments

- Name: **Chain Hub**.
- Visual identity: **Signaal** (shared with the hub-web dashboard; full system in this app's `DESIGN.md`). Light default — paper `#f2f0eb` page, `#ffffff` surfaces, ink `#1c1d1f` text — plus a switchable ink dark theme (`#1c1d1f` canvas, `#242629` panels). Signal orange (`#d9482b` light, `#ff8a5b` dark) is the single brand accent, used sparingly: signal lines, corner ticks, status dots, the one primary action. Engineering-drawing restraint: hairlines over shadows, near-sharp corners, mono designators.
- A drawn logo mark exists: `LogoMark` / `LogoLockup` inline SVGs stroked in `currentColor` so they follow the theme (source asset `logo-lockup.svg`). No raster logo assets.
- Voice: confident and quiet, not hypey — engineering-drawing register, honest about what exists (e.g. mock numbers are labeled as examples).

## Evidence on Hand

- Real, working hub-web dashboard running locally in this repo — used as genuine product screenshots on the landing page (framed as `Fig. N` drawing details), never illustrated mockups.
- Published npm package (`chain-hub@1.0.0`, beta dist-tag) and public repo `martijnbokma/chain-hub` — installable proof, not vaporware.
- No customers, testimonials, press, or usage numbers yet — launched but young; do not fabricate social proof. Social footer links are still placeholders.

## Product Principles

1. Local-first by default — no cloud dependency to use the product.
2. One clear source of truth on disk, not per-editor copies.
3. Editor-agnostic — the hub does not privilege one editor over another.
4. Calm, workflow-first UX over feature-dense UX (carries into marketing tone: confident and quiet, not hypey).
5. Show real product state (screenshots of the actual dashboard) rather than invented mockups or stock imagery.
6. Optional means optional — AI augments but never gates; off by default, keys stay local, core workflows run without it.
