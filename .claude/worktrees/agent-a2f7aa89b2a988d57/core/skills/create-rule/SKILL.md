---
name: create-rule
description: >-
  Create persistent AI rules: Cursor .mdc rules, Chain Hub rules/, or
  editor-specific instruction files (CLAUDE.md, AGENTS.md). Use when you want to
  add coding standards, project conventions, file-specific patterns, or asks
  about .cursor/rules/, rules/global.md, or AGENTS.md.
---
# Creating persistent AI rules

Rules are long-lived instructions the agent loads by default or when certain files are in scope. **Which format and path depend on the editor** — pick the row that matches where the user works, or use **Chain Hub** as a single source of truth.

## Chain Hub (all linked editors)

If the project uses **Chain Hub**, prefer editing canonical rule files under **`CHAIN_HOME/rules/`** (for example `global.md`, `cursor-global.mdc`). Run `chain setup` so copies or symlinks land in each tool (Cursor global rules, Claude `CLAUDE.md`, Windsurf memories file, etc., per your adapter configuration). Check `chain status` for the active `CHAIN_HOME`.

## Cursor: `.cursor/rules/*.mdc`

Cursor loads **`.mdc` files** with YAML frontmatter from `.cursor/rules/` (nested dirs allowed). This is the format described in the rest of this skill.

## Gather Requirements

Before creating a rule, determine:

1. **Purpose**: What should this rule enforce or teach?
2. **Scope**: Should it always apply, or only for specific files?
3. **File patterns**: If file-specific, which glob patterns?

### Inferring from Context

If you have previous conversation context, infer rules from what was discussed. You can create multiple rules if the conversation covers distinct topics or patterns. Don't ask redundant questions if the context already provides the answers.

### Required Questions

If the user hasn't specified scope, ask:
- "Should this rule always apply, or only when working with specific files?"

If they mentioned specific files and haven't provided concrete patterns, ask:
- "Which file patterns should this rule apply to?" (e.g., `**/*.ts`, `backend/**/*.py`)

It's very important that we get clarity on the file patterns.

Use the AskQuestion tool when available to gather this efficiently.

---

## Claude Code and similar CLIs

**Claude Code** typically uses project-root **`CLAUDE.md`** and optional **`~/.claude/CLAUDE.md`**: plain Markdown (no `.mdc` glob frontmatter in the Cursor sense). Split sections with headings; keep files focused. Subagents and skills are separate mechanisms — see the create-subagent skill.

## Other IDEs

- **VS Code + GitHub Copilot / Chat:** use **`.github/copilot-instructions.md`**, **`AGENTS.md`**, or workspace prompts per Microsoft’s current docs — not `.mdc`.
- **Windsurf:** global rules often live under Codeium paths (Chain Hub can map `rules/global.md` for you).
- **JetBrains AI:** built-in project instructions UI and optional repo files — follow JetBrains documentation, not `.cursor/rules/`.

When the user’s editor is unknown, **ask** which environment they use before choosing a path.

## Rule file format (Cursor `.mdc`)

Rules are `.mdc` files in `.cursor/rules/` with YAML frontmatter:

```
.cursor/rules/
  typescript-standards.mdc
  react-patterns.mdc
  api-conventions.mdc
```

### File Structure

```markdown
---
description: Brief description of what this rule does
globs: **/*.ts  # File pattern for file-specific rules
alwaysApply: false  # Set to true if rule should always apply
---

# Rule Title

Your rule content here...
```

### Frontmatter Fields

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | What the rule does (shown in rule picker) |
| `globs` | string | File pattern - rule applies when matching files are open |
| `alwaysApply` | boolean | If true, applies to every session |

---

## Rule Configurations

### Always Apply

For universal standards that should apply to every conversation:

```yaml
---
description: Core coding standards for the project
alwaysApply: true
---
```

### Apply to Specific Files

For rules that apply when working with certain file types:

```yaml
---
description: TypeScript conventions for this project
globs: **/*.ts
alwaysApply: false
---
```

---

## Best Practices

### Keep Rules Concise

- **Under 50 lines**: Rules should be concise and to the point
- **One concern per rule**: Split large rules into focused pieces
- **Actionable**: Write like clear internal docs
- **Concrete examples**: Ideally provide concrete examples of how to fix issues

---

## Example Rules

### TypeScript Standards

```markdown
---
description: TypeScript coding standards
globs: **/*.ts
alwaysApply: false
---

# Error Handling

\`\`\`typescript
// ❌ BAD
try {
  await fetchData();
} catch (e) {}

// ✅ GOOD
try {
  await fetchData();
} catch (e) {
  logger.error('Failed to fetch', { error: e });
  throw new DataFetchError('Unable to retrieve data', { cause: e });
}
\`\`\`
```

### React Patterns

```markdown
---
description: React component patterns
globs: **/*.tsx
alwaysApply: false
---

# React Patterns

- Use functional components
- Extract custom hooks for reusable logic
- Colocate styles with components
```

---

## Checklist

- [ ] Correct **target** chosen (Chain Hub `rules/`, Cursor `.cursor/rules/`, or `CLAUDE.md` / `AGENTS.md` as appropriate)
- [ ] For Cursor `.mdc`: frontmatter and globs / `alwaysApply` configured correctly
- [ ] Content under ~500 lines per focused rule (split large policies)
- [ ] Includes concrete examples where it helps
