---
name: commit
description: >-
  Writes structured git commit messages following Conventional Commits. Use
  when the user asks to commit, says "commit this", mentions writing a commit
  message, or when git commit context is present. Produces type(scope): subject
  format with optional body and breaking change notation — cross-editor, works
  in Cursor, Claude Code, Windsurf, and any other AI editor.
---

# Commit — Conventional Commits

## Format

```
type(scope): subject

[optional body]

[optional footer(s)]
```

**First line** must be ≤ 72 characters total.

---

## Types

| Type | Use for |
|------|---------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `style` | Formatting, whitespace — no logic change |
| `refactor` | Code restructuring without feature or fix |
| `test` | Adding or updating tests |
| `chore` | Build, tooling, dependency updates |
| `perf` | Performance improvements |
| `ci` | CI/CD pipeline changes |
| `build` | Build system or external dependencies |
| `revert` | Reverts a previous commit |

---

## Scope (optional)

- Lowercase noun in parentheses: `feat(auth):`, `fix(parser):`
- Use the module, package, or subsystem being changed
- Omit if the change is truly cross-cutting

## Subject

- Imperative mood: "add", not "added" or "adds"
- No period at the end
- No capital first letter (after the colon + space)

## Body (optional)

- Blank line between subject and body
- Explain **why**, not what — the diff already shows what changed
- Wrap at ~72 chars

## Breaking changes

Append `!` after the type (or scope) **and/or** add a `BREAKING CHANGE:` footer:

```
feat(api)!: remove v1 endpoint

BREAKING CHANGE: /api/v1 is removed; migrate to /api/v2
```

---

## Example

**Diff summary:** Added rate-limit middleware to all `/api` routes; removed the old `throttle.js` helper and its three call-sites.

**Resulting commit:**

```
feat(api): add rate-limit middleware to all routes

Replaces the ad-hoc throttle.js helper with express-rate-limit for
consistent 429 responses and configurable windows per environment.

BREAKING CHANGE: throttle.js is removed; callers must migrate to the
new RateLimitMiddleware or configure their own per-route limits.
```

---

## Quick checklist

- [ ] First line ≤ 72 chars
- [ ] Type is from the list above
- [ ] Subject in imperative mood, no period
- [ ] Body explains *why* if non-obvious
- [ ] Breaking change marked with `!` and/or `BREAKING CHANGE:` footer
