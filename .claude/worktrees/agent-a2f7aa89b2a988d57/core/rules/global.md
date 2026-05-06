---
description: Minimal baseline for repo-facing work—language, formatting when tools are absent, structure, errors, and matching the project you are in.
---

# Global Rules (baseline)

These rules apply unless the repository documents stricter or different conventions.

## Language & documentation

- Prefer **English** for code identifiers, comments, commit subjects, and technical docs committed to the repo, unless the project’s localization or language policy says otherwise.
- **Conversation language** can differ; keep **repository** artifacts aligned with the project’s chosen language policy.

## Terminology & formats

- **One concept, one term** in code, docs, and user-facing copy unless a glossary says otherwise.
- **Machine-readable dates/times**: ISO 8601 with a timezone or `Z` for UTC when the format matters for APIs, logs, or storage.

## Layout & formatting

- **Project tooling wins**: `.editorconfig`, Prettier, ESLint, Biome, `rustfmt`, and similar take precedence.
- **If nothing is configured**: UTF-8, LF, consistent indentation (often 2 spaces for web/JSON/YAML); respect ecosystem defaults (e.g. tabs in Go, Makefiles).

## Structure & changes

- Prefer **small, focused modules**, clear boundaries between layers, and **matching patterns already in the repo** over introducing a new style ad hoc.
- Avoid unrelated drive-by refactors in the same change as a feature or fix.

## Version control (lightweight)

- Follow the **branching and review model** the repo already uses (trunk, GitFlow, etc.); if undocumented, use short-lived topic branches and merge via PR when the host supports it.
- Prefer **clear commit messages**. [Conventional Commits](https://www.conventionalcommits.org/) is a good default when the project does not define another format: `type(scope): subject`.

## Error handling & safety

- **Fail fast** for invalid state; **user-facing** messages should be actionable and avoid leaking internals or stack traces in normal responses.
- **Do not commit secrets**, tokens, or real `.env` files; validate config where the project already does.

## Quality

- When the project defines checks (tests, typecheck, lint), run **those** before considering work done—do not substitute your own stack without team agreement.
