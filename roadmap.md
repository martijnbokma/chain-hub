# Recommended scope for the next epic

Based on the current state of Chain Hub, there are four natural directions.

**Status legend:** `Implemented` | `Partial` | `Open`

## Direction 1 — Registry & discovery expansion

- [Open] Add `commit`, `debug`, and `code-review` so they can be installed via `chain add`
- [Open] Registry page on the website (`chainhub.one/registry`) with search
- [Open] Improve `chain search` results with better ranking

## Direction 2 — Premium skill packs (separate track)

- [Partial] Skill-pack infrastructure: separate npm package, independent versioning, `chain add --pack`
- [Implemented] Define first premium pack (for example TypeScript-specific, React, or Python)
- [Open] Define billing/access model (separate from `core/`)

### Current status (May 2026)

- [Partial] `chain add github:<owner>/<repo> --pack` installs skills and registers under `packs`
- [Partial] Pack-specific versioning via `chain-hub-pro/pack.yaml` (not via npm release flow)
- [Implemented] First premium pack exists as private `chain-hub-pro` repository with skills + companion assets
- [Open] Separate npm package for Pro pack delivery
- [Open] Billing/license flow outside GitHub access

### Next milestones (concrete)

- **M1 — CLI pack manifest support**
  - Make `chain add ... --pack` read `pack.yaml`
  - Install `agents/`, `workflows/`, and `rules/` alongside `skills/` based on manifest
  - Add regression tests for manifest parsing + install contract
- **M2 — Choose and lock delivery model**
  - Option A: private GitHub-only (current model, improved DX)
  - Option B: separate npm package (`@chain-hub/pro-pack`) with semver and publish pipeline
  - Decision criteria: maintenance load, access control, and enterprise expectations
- **M3 — Access/billing MVP**
  - Define entitlement source (GitHub org/team, license token, or Stripe-backed licensing service)
  - Add `chain pro login` + `chain pro status` (or equivalent)
  - Block pack update/install with clear error when entitlement is missing
- **M4 — Release and update policy**
  - Contract: core remains open-source track, Pro pack updates on its own cadence
  - Version compatibility matrix: minimum `chain` CLI version per Pro pack release
  - Operator runbook: install, update, rollback

### Definition of done for Direction 2

- `chain add --pack` delivers a complete pack install without manual companion sync
- Pro pack has its own versioning and release process, separate from `core/`
- Access model is technically enforced (not just private repo access)
- Install/update/troubleshooting documentation exists in docs + Pro repo workflow

## Chain Hub Pro Monetization & Delivery

### Positioning and packaging (decision frame)

- [Open] Position Chain Hub Pro as a **tiered add-on** on top of Chain Pro (`Hub Pro Team`, `Hub Pro Business`, `Hub Pro Enterprise`)
- [Open] Explicitly define per-tier limits: feature boundaries, seat/workspace limits, retention, support SLA
- [Open] Confirm segment strategy: Team/Business self-serve, Enterprise contract-led

### Entitlements and licensing (hybrid model)

- [Open] Formalize hybrid entitlement model: cloud as source + offline CLI fallback with time-bound tokens
- [Open] Lock entitlement fields: `workspace_id`, `plan_tier`, `seats`, `status`, `renewal_date`, `grace_period_days`, `offline_token_expiry`
- [Open] Define grace policy (duration + post-expiry behavior): Pro features read-only, no hard lock of base data

### Billing, payment methods, and invoicing

- [Open] MVP payment methods: card + SEPA/ACH for self-serve, invoice billing for enterprise
- [Open] Define invoicing logic: monthly/yearly, proration for seat changes and mid-cycle add-on activation
- [Open] Define dunning and retries: 3-level retry, reminders, grace window, downgrade path
- [Open] Document tax/compliance requirements per region (including EU VAT, company details)

### Updates, rollout, and compatibility

- [Open] Lock release channels: `stable` (default) + optional `early-access`
- [Open] Implement rollout strategy: internal/design-partner canary, then 10% -> 50% -> 100% with rollback switch
- [Open] Define update contract: Chain Hub Pro release compatible with specific Chain Pro/CLI versions
- [Open] Document offline update path with signed manifest and entitlement validation

### Operations, support, and launch readiness

- [Open] Finalize support model per tier with response times and escalation path
- [Open] Finalize runbooks: failed payment, entitlement mismatch (cloud/local), upgrade/downgrade impact
- [Open] Specify in-product activation flow: contextual upsell, 14-day trial, automatic trial expiry
- [Open] Activate KPI set for GTM and operations: attach rate, trial->paid, churn, failed payment rate, tickets per 100 workspaces
- [Open] Deliver legal/commercial launch artifacts: add-on terms, pricing FAQ, billing FAQ
- [Open] Close decision round based on `docs/chain-hub-pro-decision-log.md` (4 open product decisions)

## Direction 3 — Multi-hub & team support

- [Open] Shared hub for teams: `chain init --shared` or team registry
- [Open] Extend `skills-registry.yaml` with team bucket
- [Open] Conflict resolution for overlapping skills between personal and team

## Direction 4 — Chain Hub UI (web dashboard)

- [Open] Visual hub manager in the browser
- [Open] View, edit, and install skills without CLI
- [Open] Integration with `chain status` output
