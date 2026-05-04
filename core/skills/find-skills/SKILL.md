---
name: find-skills
description: >-
  Helps users discover and install agent skills for Chain Hub: search the Chain
  Hub registry plus the skills.sh open directory from the CLI, list what is
  installed, and bridge to the wider ecosystem. Use when the user asks how to do
  something that might be covered by a skill, wants to find or install skills,
  or mentions discovery, skills.sh, or npx skills.
---

# Find skills (Chain Hub)

Guide discovery and installation so skills land in **one hub** (`CHAIN_HOME`, default `~/chain-hub`) and sync to linked editors via `chain setup`.

## When to use this skill

- Questions like “how do I do X”, “is there a skill for X”, “find a skill for …”
- The user wants to extend the agent with a workflow, checklist, or domain pack
- They mention **skills.sh**, **`npx skills`**, GitHub skill repos, or the [open agent skills CLI](https://github.com/vercel-labs/skills)

## Step 1 — Prefer Chain Hub

1. **Resolve the hub** — `chain status` (or env `--chain-home` / `CHAIN_HOME`) shows the active `CHAIN_HOME`.
2. **See what is already there** — `chain list` separates **protected core** skills from **user-installed** skills under `CHAIN_HOME/skills/`, with registry/GitHub hints where recorded.
3. **Search** — `chain search` / `chain find` query **both** the Chain Hub registry index (for `chain add <slug>`) and the **[skills.sh](https://skills.sh/)** directory API (same `/api/search` as `npx skills find` — see [vercel-labs/skills](https://github.com/vercel-labs/skills)):

   ```bash
   chain search "<keywords>"
   chain find "<keywords>"
   chain search "<keywords>" --hub-only   # only Chain Hub index, no internet directory
   ```

   Output lists **Chain Hub** hits first, then **skills.sh** hits with `chain add github:<owner>/<repo> --skill <id>` and a page URL. Override directory host with **`SKILLS_API_URL`** if needed.

   For index-only matches:

   ```bash
   chain add <slug>
   ```

4. **Install from GitHub** when the index has no match but a repo follows the usual layout (`skills/<name>/SKILL.md`, etc. — same conventions `chain add` expects):

   ```bash
   chain add github:<owner>/<repo>
   ```

   Optional: `chain add github:<owner>/<repo> --skill <folder-name>` to pull one skill from a multi-skill repo. For curated bundles tracked for updates, `--pack` registers under the **packs** bucket (see CLI help).

After installs, remind the user to run **`chain setup`** if new skills should appear in IDEs, and **`chain validate`** if they edited the registry by hand.

## Step 2 — Broader ecosystem (optional)

`chain search` already hits **skills.sh**; for interactive pickers or installs straight into **agent-native paths** (not `CHAIN_HOME`), the **`npx skills`** CLI from [vercel-labs/skills](https://github.com/vercel-labs/skills) remains useful.

**Bridge to Chain Hub when the user wants a single library:**

- If **`npx skills find`** or the site surfaces a **slug** that exists in the Chain Hub index → `chain add <slug>`.
- If it points to a **GitHub repo** → `chain add github:owner/repo` (with `--skill` if needed) — same hints as the CLI’s skills.sh block.
- If they only need a one-off in one editor, they may use `npx skills add` directly; duplicates across editors are avoided when the hub is the source of truth.

## Quality before you recommend

Do not recommend a skill from the open directory on name alone. Prefer:

- Clear **description** and maintained **source** repo
- Reasonable adoption signals (install counts on skills.sh, stars, org reputation) when available
- A quick glance at **SKILL.md** scope so it matches the user’s task

## Presenting results

For each candidate, give: **name/slug**, **what it does**, **install command** (`chain add …` or `chain add github:…`), and optionally a link to the repo or skills.sh page. If nothing fits, say so and offer **create-skill** (core) or a narrow custom skill under `CHAIN_HOME/skills/<slug>/`.
