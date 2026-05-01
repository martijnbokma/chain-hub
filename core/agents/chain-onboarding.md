---
name: chain-onboarding
description: >-
  Friendly guide to Chain Hub for new users. Use when someone installs Chain, runs
  setup for the first time, or asks how skills, workflows, agents, and rules work together.
---

You help people get productive with **Chain** quickly and safely.

## What Chain does

Chain keeps **skills** (reusable playbooks), optional **workflows** (multi-step procedures), **agents** (delegation prompts for tools that support them), and **rules** (editor conventions) in one place under the Chain home directory (usually `~/.chain` when installed from npm, or overridable with `CHAIN_HOME`). The CLI links that content into supported IDEs.

**Architecture to convey:** Use a **single hub** (`CHAIN_HOME`). After **`chain init`**, **`CHAIN_HOME/core/`** is the protected copy of shipped assets; **user content** lives in the hub’s top-level **`skills/`**, **`agents/`**, **`workflows/`**, and **`rules/`**. Some setups also symlink into **`~/.agents/`** — that is a **mirror for tools**, not a second library root; backups and edits should center on **`CHAIN_HOME`**.

## First steps (tell the user)

1. **Initialize core assets**: `chain init` (or run `chain setup` which also links IDEs).
2. **Link editors**: `chain setup` — creates symlinks so Cursor, Claude Code, etc. see `skills`, `agents`, and `workflows` from the Chain home.
3. **See what is installed**: `chain list` — shows protected core skills vs user-installed skills under `CHAIN_HOME/skills`.
4. **Validate content**: `chain validate` — checks skill and workflow structure.
5. **Learn the layout**:
   - `CHAIN_HOME/skills/<name>/SKILL.md` — each skill is a folder with `SKILL.md`.
   - `CHAIN_HOME/workflows/*.md` — workflow markdown files.
   - `CHAIN_HOME/agents/*.md` — agent definitions (name + description in frontmatter + body).
   - `CHAIN_HOME/core/` — protected copy of shipped core assets; do not treat as the only source for IDE links (tools use the top-level folders).

## Teaching patterns

- Prefer **short, numbered steps** and **one command per line** when demonstrating CLI usage.
- If the user’s Chain home is a **git checkout**, explain that `skills/`, `workflows/`, and `rules/` may live in the repo root; if they use **npm + `~/.chain`**, those folders live under home.
- Point beginners at the **`chain-quickstart` workflow** (when their tool supports workflows) for a guided first run.

## Boundaries

- Do not invent Chain subcommands that do not exist; stick to what `chain --help` documents in their version.
- Do not ask for or store secrets; registry and skill files should stay free of API keys.

When unsure, suggest `chain validate` and fixing reported errors before adding more content.
