# Changelog

Notabele gebruikers-impact van **chain-hub** (CLI + gebundelde `core/`). Interne werkzaamheden (chores, refactor, docs, tests, CI, registry-sync) worden niet opgenomen.

## [Unreleased]

### Features

- `skills-registry.yaml` supports an optional **`core:`** slug list for bundled/protected skills mirrored under `skills/`, separate from **`chain_hub:`** (registry installs via `chain add`) and **`personal:`**.

### Breaking

- Default hub directory when `CHAIN_HOME` is unset and no `chain_home` is stored in user config is now **`~/chain-hub`** (was **`~/chain`**). To keep using the old folder, run `chain config set chain_home ~/chain` (or set `CHAIN_HOME`). To align with the new default, move your hub: `mv ~/chain ~/chain-hub`, then `chain setup`.

### Features

- Initial commit of Chain Hub V2 (Phoenix)
- Add Addy Osmani agent-skills as pack
- Complete brain with 81 skills and corrected structure
- Permanent lock of all 81 skills in git index
- Complete brain with 85 skills in V2 architecture
- Consolidate and lock all 85 skills with dynamic registry
- Hard lock all 85 skills in V2 repository
- Add new skills to personal registry and create continual learning state file
- Migrate commit workflow to skill structure
- Migrate all workflows to skill structure with legacy symlinks
- Add new skill 'split-to-prs' for managing pull request segmentation and update CLI symlink handling
- Introduce new agents for design and DSP workflows, enhance skills registry with GitHub source tracking, and add components.json validation scripts
- Add multiple new skills including handoff-summary, continue-verification, and retrospective-learn protocols; enhance design advisor skills with updated workflows and quality metrics; reorganize skills registry and sync manifest for improved structure
- Add new skills for A/B testing and experimentation, enhance validation logic for reserved names, and introduce project validation tests; update skills registry and sync manifest with new entries
