# Contributing to Chain Hub

This document describes how we work in this repository—especially useful for a **solo maintainer** who wants a **stable `main`** without developing on it directly.

## Branching model (lightweight, not full Git Flow)

- **`main`** — Integration branch that should stay **buildable and trustworthy**. Treat it as the line you can always return to.
- **Feature branches** — All non-trivial work happens on short-lived branches, then merges into `main`.

We do **not** use the full Git Flow model (`develop`, `release/*`, `hotfix/*`) unless release overhead is needed later. For day-to-day work, **feature branches + `main`** are enough.

### Rules of thumb

1. **Do not develop on `main`.** Start from an up-to-date `main`, create a branch, do your work there.
2. **Name branches** with a clear prefix, for example:
   - `feature/short-description`
   - `fix/issue-or-topic`
3. **Keep branches short-lived** when possible. If a branch lives a long time, merge or rebase **`main`** into it periodically to reduce conflicts.
4. **Merge when the change is ready** — locally (`git merge`) or via a pull request (PRs are useful even solo as a final checklist).

### Optional extra buffer: `develop`

A separate **`develop`** branch is **optional**. It adds a second integration line (merge features into `develop`, promote to `main` only when you want a “release moment”). For one person that is often extra bookkeeping. Prefer **`main` + feature branches** unless you explicitly want two stability levels.

### Optional: GitHub branch protection on `main`

You can require CI to pass before merging and/or block direct pushes to `main`, so work always goes through a branch or PR. That reduces accidental pushes of work-in-progress to `main`.

## Before you merge into `main`

Run the checks that CI runs for the areas you touched.

**CLI** (`cli/`):

```bash
cd cli
bun install
bun test
bun run build
bun run pack:check   # full pre-publish pipeline when changing shipped assets or release prep
```

**Marketing site** (`apps/web/`), when relevant:

```bash
cd apps/web
bun install
bun run build
```

See `.github/workflows/ci.yml` for the authoritative CI steps.

## Changelog and releases

- Changelog scope and **`npm publish`** workflow: see **`cli/README.md`** and **`cli/CHANGELOG.md`** (pre-1.0 notes).
- Version bumps and publishing are done from **`cli/`** (`chain-hub` package).

## Where to read more

- Maintainer-oriented overview: **`CLAUDE.md`**
- CLI behavior, `CHAIN_HOME`, and commands: **`cli/README.md`**
