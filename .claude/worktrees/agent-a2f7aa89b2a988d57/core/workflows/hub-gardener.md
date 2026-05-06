---
description: >-
  Turn queued learnings into safe improvements: distill inbox, review drafts,
  run chain validate, and propose hub-only edits or repo PRs — never silent
  writes to bundled core.
version: 1
---

# Hub gardener — continual learning loop

## When to Use

- After `chain reflect` produced a new draft under `learnings/drafts/`, or the user wants a scheduled “tidy my hub” pass.
- When improving **personal** content under `CHAIN_HOME`: `skills/`, `rules/`, `agents/`, `workflows/`, and overlays in `learnings/shared/<slug>/OVERLAY.md`.
- When the user asked for a **self-learning** or **hub maintenance** workflow without full autonomy on upstream `core/`.

## NOT When to Use

- One-off debugging of a single project repo (use project skills or `debug`).
- Replacing code review or security review before merging to `main`.
- Direct edits to **npm-shipped** `core/` inside the Chain Hub package without a maintainer PR and CI.

## AI Execution Guidelines

- **Scope A (default):** Only mutate files under the user’s `CHAIN_HOME` after `chain validate` passes on the hub root.
- **Scope B (upstream):** Propose changes as a **patch or PR**; never assume merge approval.
- Prefer **small diffs**: overlays and single-skill edits over rewriting many files at once.
- **Checkpoint:** After `chain reflect` (or reading the latest draft), summarize proposed changes and wait for explicit user approval before writing.

## Process

1. **Resolve hub path**  
   Use the user’s `CHAIN_HOME` (`chain status` or env). Default reminder: `~/chain-hub`.

2. **Distill queue (if not already done)**  
   - Run: `chain reflect --dry-run` first if the user only wants a preview.  
   - Run: `chain reflect` to move `learnings/queue/inbox.jsonl` into `learnings/archive/` and write `learnings/drafts/distill-*.md`.  
   - If the inbox is empty, stop with a short note — nothing to process.

3. **Read the latest draft**  
   Open the newest `learnings/drafts/distill-*.md`. Map each bullet to the target skill slug or rule file.

4. **Plan edits**  
   - For incremental guidance: draft or update `learnings/shared/<skill-slug>/OVERLAY.md` (vet bullets; drop noise).  
   - For substantive skill changes: edit `skills/<slug>/SKILL.md` only with user consent.  
   - Do **not** bulk-edit protected core slugs in the hub unless the user is the maintainer syncing from the monorepo.

5. **Validate**  
   Run: `chain validate` from `CHAIN_HOME` (or pass `--chain-home` if supported). Fix reported errors before saving further changes.

6. **Optional upstream**  
   If the user asked to improve the **chain-hub** repo: open a branch, apply changes under `core/` or `cli/`, run tests locally, open a PR — do not push to `main` directly.

## Output

- Short summary: what was in the draft, which files you touched (or propose to touch), and `chain validate` result.
- If no edits applied: list concrete next actions for the user (e.g. “approve overlay text for `debug`”).

## Verification Checklist

- [ ] Latest distill draft read (or reflect run completed successfully).
- [ ] `chain validate` passes after any hub file changes.
- [ ] No silent edits to bundled `core/` without PR flow when scope B was requested.
- [ ] User explicitly approved non-trivial rewrites to `SKILL.md` bodies.

## Related Skills

- `chain-hub`
- `create-skill`
- `create-rule`
- `debug`

## Related Workflows

- `chain-quickstart` — first-run layout before running this loop.

**Checkpoint:** Confirm whether the user wants **hub-only (scope A)** or **repo PR (scope B)** before applying edits.
