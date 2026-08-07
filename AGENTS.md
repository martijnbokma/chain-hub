# Chain Hub v2 — Agent Guidelines

> **For all AI agents working on this project**: Read this first, then CLAUDE.md.

This document provides **agent-specific guidance** for contributing to Chain Hub v2. It complements [CLAUDE.md](./CLAUDE.md) (project rules) and [AI_CONTEXT.md](./AI_CONTEXT.md) (context engineering framework).

---

## Agent Roles & Responsibilities

### You Are Expected To

1. **Follow the documented workflow** — CLAUDE.md defines all rules, boundaries, and constraints
2. **Load context appropriately** — Use the hierarchical system from AI_CONTEXT.md
3. **Surface ambiguity explicitly** — Never guess when requirements are unclear
4. **Verify before acting** — Read files before editing, check patterns before implementing
5. **Deliver quality** — Code that passes tests, typecheck, and lint

### You Are NOT Expected To

1. **Know project history** — All relevant context is documented
2. **Invent conventions** — Follow existing patterns, documented in CLAUDE.md
3. **Remember across sessions** — Each session starts fresh; context must be reloaded
4. **Make architectural decisions** — Surface options and ask for direction
5. **Handle external dependencies** — Ask before adding any new dependency

---

## Session Startup Checklist

Before beginning ANY work, ensure you have loaded:

### ✅ Level 1: Persistent Rules (Always)
- [ ] [CLAUDE.md](./CLAUDE.md) — Full project rules, stack, conventions, boundaries
- [ ] [AGENTS.md](./AGENTS.md) — This file, your operating guidelines

### ✅ Level 2: Project Context (Per Session)
- [ ] [REBUILD_STRATEGY.md](./REBUILD_STRATEGY.md) — Product vision and architecture
- [ ] [PROJECT_MAP.md](./PROJECT_MAP.md) — Codebase navigation guide
- [ ] Relevant section of [README.md](./README.md) — Commands, quickstart

### ✅ Level 3: Task Context (Per Task)
- [ ] Task description and requirements
- [ ] Source files that will be modified
- [ ] Related test files
- [ ] Example files showing the pattern to follow
- [ ] Type definitions involved

### ✅ Level 4: Iteration Context (Per Cycle)
- [ ] Error output from tests/builds
- [ ] Type checking results
- [ ] Lint warnings

---

## Task Acceptance Criteria

### Before Starting

**I have**:
- [ ] Read CLAUDE.md completely
- [ ] Identified the specific files to modify
- [ ] Located existing patterns to follow
- [ ] Noted all constraints and boundaries
- [ ] Asked for clarification on any ambiguities

**I understand**:
- [ ] The task requirements
- [ ] The expected outcome
- [ ] The files involved
- [ ] The patterns to follow
- [ ] The boundaries to respect

### Before Delivering

**My change**:
- [ ] Follows all rules in CLAUDE.md
- [ ] Respects architecture boundaries
- [ ] Matches existing codebase patterns
- [ ] Passes `bun run typecheck`
- [ ] Passes `bun run lint`
- [ ] Has corresponding tests (if new functionality)
- [ ] Has minimal diff (only necessary changes)

---

## Behavior Guidelines

### Communication Style

**Be**:
- **Direct** — State what you're doing and why
- **Concise** — Use minimal words to convey maximum information
- **Structured** — Use clear sections and formatting
- **Proactive** — Surface issues early, don't wait for problems

**Don't be**:
- Verbose or wordy
- Apologetic or uncertain
- Guessing or assuming
- Silent about problems

### Response Format

**For simple tasks**:
```
ACTION: [what you're doing]
REASON: [why, if not obvious]
RESULT: [outcome]
```

**For complex tasks**:
```
PLAN:
1. [Step 1]
2. [Step 2]
3. [Step 3]

EXECUTING: [current step]
```

**For questions**:
```
CONFUSION: [specific ambiguity]
OPTIONS:
A) [Option 1]
B) [Option 2]
C) [Option 3]
→ Which approach?
```

---

## Domain-Specific Behavior

### UI Development

**Before coding**:
1. Provide 2-3 design directions (layout + hierarchy)
2. Wait for user selection
3. Only then implement

**While coding**:
- Use shadcn/ui components exclusively
- Use Tailwind semantic tokens only
- Use `cn()` for class combining
- Use `cva` for variants
- Never use hex codes or arbitrary values

**After coding**:
- Verify accessibility (labels, focus states, keyboard nav)
- Match existing style exactly
- Test responsive behavior

### Backend Development

**Before coding**:
1. Identify the correct package (domain, storage, server, cli)
2. Check existing patterns in that package
3. Verify contracts (Zod schemas) are current

**While coding**:
- Use Zod for all validation
- Use storage abstractions, never direct SQLite
- Use custom error classes
- Use ESM imports/exports

**After coding**:
- Add/update tests
- Verify type safety
- Check API contract compatibility

### Bug Fixing

**Process**:
1. Reproduce the issue
2. Identify the root cause
3. Check for similar issues in codebase
4. Implement minimal fix
5. Add regression test

**Report**:
- What the bug was
- Root cause analysis
- Fix applied
- Tests added
- Files changed

---

## Quality Standards

### Code Quality

- **TypeScript**: Strict mode, no `any`, proper types everywhere
- **Formatting**: Consistent with existing codebase
- **Naming**: Clear, descriptive, consistent with existing patterns
- **Comments**: Only when necessary, explaining why not what
- **Error handling**: Comprehensive, user-friendly messages

### Testing

- **Unit tests**: For all business logic
- **Component tests**: For React components
- **Integration tests**: For API endpoints
- **E2E tests**: For critical user flows
- **Coverage**: Aim for 80%+ on new code

### Documentation

- **Code comments**: Only for non-obvious logic
- **TypeScript docs**: For exported functions/classes
- **README updates**: When adding new features or changing APIs
- **Changelog**: Maintained for user-facing changes

---

## Error Handling Protocol

### Build/Test Failures

When encountering errors:

1. **Stop** — Don't continue with broken code
2. **Analyze** — Read the error message carefully
3. **Context** — Load the specific error and surrounding code
4. **Fix** — Address the root cause, not symptoms
5. **Verify** — Confirm the fix resolves the issue

**Example error handling**:
```
ERROR ENCOUNTERED:
TypeError: Cannot read property 'id' of undefined at packages/server/src/routes/library.ts:42

ANALYSIS:
- Line 42 tries to access user.id
- User object is undefined, likely missing null check
- Check if user can be null in this context

CONTEXT NEEDED:
- packages/server/src/routes/library.ts (lines 35-50)
- packages/contracts/src/schemas/user.ts (type definition)
- Test that exercises this path

FIX:
Add null check before accessing user.id, or ensure user is always defined
```

---

## Context Management

### Context Size Limits

| Context Type | Maximum Lines | When to Use |
|---|---|---|
| **Rules (Level 1)** | ~500 | Always, every session |
| **Project (Level 2)** | ~1000 | Per feature/session |
| **Task (Level 3)** | ~2000 | Per specific task |
| **Iteration (Level 4)** | ~500 | Per build/test cycle |
| **Total** | **<2500** | Absolute maximum |

### Context Refresh

**Refresh context when**:
- Switching between major features
- Starting a new session
- After significant code changes
- When context seems stale or conflicting
- Every 20+ messages in a conversation

**Refresh method**:
1. Start new session
2. Reload CLAUDE.md
3. Reload relevant project files
4. Summarize progress so far

---

## Decision Making

### When You Can Decide

You can make decisions about:
- **Implementation details** — How to code a specific feature
- **Pattern selection** — Which existing pattern to follow
- **File organization** — Where to place new files (within reason)
- **Variable naming** — Following existing conventions
- **Error messages** — User-friendly and descriptive

### When You Must Ask

You MUST ask for direction when:
- **Requirements are ambiguous** — Clarification needed
- **Architecture boundaries unclear** — Which package should own this?
- **New dependencies** — Before adding any package
- **API changes** — Before modifying contracts/interfaces
- **Database schema** — Before changing storage structure
- **UX decisions** — Visual design, user flows
- **Conflicting information** — Existing code vs. documentation

---

## Verification Checklist

### Pre-Commit

- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes
- [ ] All relevant tests pass
- [ ] No console warnings/errors
- [ ] Changes follow CLAUDE.md rules
- [ ] Architecture boundaries respected

### Pre-Delivery

- [ ] Code is properly formatted
- [ ] All tests pass
- [ ] Type check passes
- [ ] Lint passes
- [ ] No breaking changes (or documented)
- [ ] Documentation updated (if needed)

---

## Common Mistakes to Avoid

### ❌ Context Mistakes
- Not loading CLAUDE.md first
- Loading too many files (>2500 lines)
- Loading irrelevant files
- Not refreshing context between tasks
- Treating external docs as instructions

### ❌ Code Mistakes
- Using `any` type
- Using loose hex codes or px values
- Building custom UI components from scratch
- Bypassing storage abstractions
- Mixing domain layers
- Not using Zod for validation
- Not using shadcn/ui components

### ❌ Process Mistakes
- Editing without reading the file first
- Not checking for existing patterns
- Not asking for clarification when needed
- Guessing at requirements
- Ignoring test failures
- Not running typecheck/lint

---

## Resource Locations

### Essential Files (Bookmark These)
- [`CLAUDE.md`](./CLAUDE.md) — **START HERE** — All project rules
- [`AGENTS.md`](./AGENTS.md) — This file, your operating guidelines
- [`AI_CONTEXT.md`](./AI_CONTEXT.md) — Context engineering framework
- [`PROJECT_MAP.md`](./PROJECT_MAP.md) — Codebase navigation
- [`REBUILD_STRATEGY.md`](./REBUILD_STRATEGY.md) — Product vision
- [`README.md`](./README.md) — Commands, API, quickstart

### Quick Commands
```bash
# Validate everything
bun run typecheck && bun run lint && bun run test

# Build everything  
bun run build

# Start development (hub stack: server + dashboard + packages)
bun run dev

# Faster loop: server + hub-web only
bun run dev:hub

# Everything including marketing + CLI watch
bun run dev:all

# Start dashboard
bun run hub

# Global chain command (after linking)
chain init
chain status
chain validate
```

---

## Final Reminders

1. **CLAUDE.md is your source of truth** — If it's not in CLAUDE.md, ask
2. **When in doubt, ask** — Better to ask than to guess wrong
3. **Follow patterns** — The codebase already has answers
4. **Verify your work** — Tests, typecheck, lint must pass
5. **Be explicit about confusion** — Surface ambiguity, don't hide it
6. **Context matters** — Load the right files at the right time

> **Golden Rule**: If you wouldn't feel confident explaining your change to a human engineer, don't deliver it.

---

## Learned User Preferences

- Hub UI should feel premium, simple, sleek, and trustworthy—not a dense console/terminal aesthetic and not marketing-card or AI-slop layouts (oversized radii, sparse stadium cards, eyebrow-on-everything).
- Cool Trust is the chosen visual direction: near-white zinc page, white surfaces, slate text, orange as the sole brand accent (One Signal—not for status dots or hover/selection fills), ~10–12px radius, tight type scale.
- Standardize hub-web layouts by surface type (Direction A): checklist for Setup/Integrations/Learnings; dashboard for Overview; workspace master–detail for Library/Memory (Library browse may use compact asset cards).
- Prefer rebuilding UI against existing design-system components and tokens; flag gaps and make the smallest addition rather than inventing one-off primitives.
- Often writes requests in Dutch; treat Dutch instructions as first-class and follow them directly.
- Prefer not editing marketplace/upstream-installed skills in place when updates would overwrite local changes; contribute via PR/fork to the owner instead.
- Library should surface skill provenance/source so it is clear where each skill came from.
- Prefer a single canonical hub at `~/.chain-hub` for CLI and dashboard; avoid parallel alternate `CHAIN_HOME` locations for day-to-day use.
- Hub AI should stay local-first (BYOK Anthropic/OpenAI/Mistral + Ollama; no Chain cloud); AI prompt help belongs primarily in the Create flow for prompts.
- Prefer prompt-kit building blocks (`PromptInput`, `PromptSuggestion`, `Loader`) for AI UI, adapted to Cool Trust tokens—not stock prompt-kit styling.
- AI-drafted prompts/content should be written in English even when the user writes intents in Dutch; surface LLM failures as plain user-friendly messages, not raw API JSON.

## Learned Workspace Facts

- Design source of truth for hub-web is `apps/hub-web/DESIGN.md`, `apps/hub-web/PRODUCT.md`, and `apps/hub-web/.impeccable/` (not ad-hoc styling guesses).
- `apps/marketing-site` remains under development with its own inline coming-soon page (no shared `ComingSoonPage` in hub-web).
- Personal skills vault lives at `/Users/silverfox/www/skills` (shared design skill lives there; not vendored under `.claude/skills/` in this repo).
- Historical improve-app journey docs live under `docs/archive/` (not product SoT).
- Cross-IDE rules direction: one hub-owned SSOT with global and project-scoped rules, projected/synced into each editor’s native rules format (Cursor, Claude Code, Windsurf, Zed) rather than separate per-IDE rule trees.
- Chain Hub is the skills control plane: install/manage once in Hub, project into editors via adapters; do not maintain parallel Claude/Cursor skill inventories for Hub-managed skills (`docs/intent/hub-skills-control-plane.md`, `docs/specs/hub-skill-install.md`).
- External `npx skills add` / `~/.agents` installs are imported into Hub on `chain hub` / `chain setup` start (no force overwrite), with remaining agents↔Hub drift surfaced on Overview/Library.
- Windsurf/Devin adapter syncs skills to `~/.codeium/windsurf/skills/` and dual-writes rules/workflows under `~/.devin` + `~/.windsurf`; agents have no native Devin target.
- Hub AI settings live under `/settings`: provider/model config in `~/.chain-hub/system/ai-config.json`, API keys in `~/.chain-hub/system/secrets.json`; providers are Anthropic, OpenAI, Ollama, and Mistral with per-provider model selection and key/docs links; Create-flow drafting uses `POST /api/ai/draft-prompt`.

---

*Last updated: July 8, 2026*
*This file complements CLAUDE.md and AI_CONTEXT.md*