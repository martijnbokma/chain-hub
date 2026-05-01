---
description: Guided first-run tour for Chain — init, setup, list, validate, and where content lives.
version: 1
---

# Chain quickstart

## When to Use

- Right after installing Chain from npm or cloning the tooling repo.
- When a user says they “don’t know where skills/workflows live” or symlinks seem wrong.
- Before adding custom skills so the home directory layout is clear.

## NOT When to Use

- Debugging a specific skill’s content (use that skill’s docs or `chain validate` output instead).
- Replacing project-specific onboarding for an application repo.

## AI Execution Guidelines

- Keep instructions **tool-neutral** where possible; mention IDE linking only as “after `chain setup`”.
- Use the user’s actual `CHAIN_HOME` when known; otherwise state the default `~/.chain`.
- **Checkpoint:** After each major step, pause and ask if the command succeeded before continuing.

## Process

1. **Confirm install**  
   Ask the user to run `chain --help` and verify the binary runs.

2. **Initialize**  
   - Run: `chain init`  
   - Explain: copies packaged **`core/`** into `CHAIN_HOME/core` and refreshes default **agents** and **workflows** at the top level of `CHAIN_HOME` (where IDEs look).

3. **Link editors**  
   - Run: `chain setup`  
   - Explain: symlinks `skills`, `agents`, and `workflows` from `CHAIN_HOME` into supported IDE directories.

4. **Inspect inventory**  
   - Run: `chain list`  
   - Explain: **protected core** skills ship with Chain; user skills live in `CHAIN_HOME/skills/<slug>/`.

5. **Validate**  
   - Run: `chain validate`  
   - Fix any reported skill/workflow issues before adding new content.

6. **Next learning steps**  
   - Open **`create-skill`** and **`create-rule`** skills to add custom content.  
   - Prefer small skills with clear `description` frontmatter.

## Output

- A short checklist the user can reuse: init → setup → list → validate → add skills.
- The absolute or default path for `CHAIN_HOME` and the three main folders: `skills/`, `workflows/`, `agents/`.

## Verification Checklist

- `chain init` completed without errors.
- `chain setup` reported IDE links (or “no IDEs detected” is understood).
- `chain list` shows core skills.
- `chain validate` passes or remaining errors are understood and tracked.

## Related Skills

- `create-skill`
- `create-rule`
- `migrate-to-skills`
- `update-cli-config`

## Related Workflows

- None — this is the entry workflow; add follow-ups under `CHAIN_HOME/workflows/` as needed.
