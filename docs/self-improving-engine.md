# Chain Hub Self-Improving Engine

Design blueprint for adding controlled autonomous improvement to Chain Hub.

## 1. Goal

Build an engine that continuously improves `skills`, `workflows`, `agents`, and `rules` based on observed usage and learnings, while keeping humans in control of risky changes.

## 2. Non-goals (MVP)

- No silent direct mutation of protected core assets.
- No automatic push to remote repositories.
- No unreviewed multi-file behavior changes by default.
- No entitlement or billing coupling in the first milestone.

## 3. Product principles

- **Evidence before edits:** proposals must reference observed learnings.
- **Safe-by-default:** generate proposals first; apply only after explicit approval.
- **Small batches:** enforce max changes per run.
- **Traceability:** every proposal has provenance, confidence, and rollback metadata.
- **Deterministic gates:** run validation and policy checks before apply.

## 4. High-level flow

1. **Observe**
   - Existing runtime signals are collected as learning events.
2. **Reflect**
   - Distill queued learnings into draft insights (`chain reflect`).
3. **Propose**
   - Agent generates concrete, scoped change proposals.
4. **Review**
   - User approves or rejects proposals in Hub UI.
5. **Apply**
   - Approved proposals are applied through guarded APIs.
6. **Verify**
   - Run validation and tests; record outcomes.
7. **Measure**
   - Track whether accepted changes improve outcomes over time.

## 5. Architecture

### Engine modules

- `observation-service`
  - Reads recent learnings and summarizes candidate pain patterns.
- `proposal-service`
  - Produces proposal objects with diffs and rationale.
- `policy-service`
  - Enforces allowed scopes and risk constraints.
- `apply-service`
  - Applies approved proposals and captures result artifacts.
- `verification-service`
  - Runs `chain validate` and optional test commands.
- `telemetry-service`
  - Stores run-level metrics and proposal outcomes.

### Execution modes

- **Manual mode (MVP default)**
  - User clicks “Generate proposals”, then approves changes.
- **Semi-auto mode**
  - Engine auto-generates daily, user approves in batches.
- **Auto mode (later)**
  - Only low-risk proposal types can auto-apply under strict policy.

## 6. Data model

### Proposal

- `id`
- `created_at`
- `kind` (`skill_patch` | `workflow_patch` | `agent_patch` | `rule_patch`)
- `target_path`
- `summary`
- `rationale`
- `evidence_refs` (learning event IDs or distilled section IDs)
- `risk_level` (`low` | `medium` | `high`)
- `confidence` (`0..1`)
- `diff_preview`
- `status` (`draft` | `approved` | `rejected` | `applied` | `failed`)
- `rollback_hint`

### Run

- `run_id`
- `started_at` / `ended_at`
- `mode`
- `proposal_count`
- `approved_count`
- `applied_count`
- `failed_count`
- `validation_status`
- `notes`

### Storage location

- `CHAIN_HOME/learnings/proposals/` for proposal records
- `CHAIN_HOME/learnings/runs/` for run metadata
- Keep append-only history for auditability

## 7. API design (Hub backend)

### `POST /api/improve/proposals/generate`

- Input:
  - `{ maxProposals?: number, scopes?: ("skills"|"workflows"|"agents"|"rules")[] }`
- Output:
  - `{ runId, generated, proposals: Proposal[] }`

### `GET /api/improve/proposals`

- Output:
  - `{ proposals: Proposal[] }`

### `POST /api/improve/proposals/:id/approve`

- Output:
  - `{ ok: true }`

### `POST /api/improve/proposals/:id/reject`

- Input:
  - `{ reason?: string }`
- Output:
  - `{ ok: true }`

### `POST /api/improve/apply`

- Input:
  - `{ proposalIds: string[] }`
- Output:
  - `{ runId, applied, failed, validation }`

### `GET /api/improve/runs/:runId`

- Output:
  - `{ run, proposals, logs }`

## 8. Policy and safety gates

### Global gates

- Block apply if proposal has missing `evidence_refs`.
- Block apply when `risk_level === high` unless explicitly force-approved.
- Block apply if target is protected core in MVP.
- Enforce max proposals per run (default: 5).

### Validation gates

- Always run `chain validate` before and after apply.
- For changed code paths, run scoped tests where available.
- If verification fails, mark run as failed and keep a rollback path.

### Rollback model

- Save pre-apply snapshot metadata.
- Emit actionable rollback instructions in run output.

## 9. Hub UI surfaces

### New sidebar section

- `Improve`

### Improve screen blocks

- **Overview**
  - Last run, proposal backlog, acceptance rate.
- **Generate**
  - Scope filters and max proposal count.
- **Proposal queue**
  - Diff preview, rationale, confidence, risk, approve/reject actions.
- **Apply**
  - Batch apply approved proposals.
- **Run history**
  - Recent run outcomes and validation statuses.

## 10. Telemetry

Track events:

- `improve_generate_started`
- `improve_generate_completed`
- `improve_proposal_approved`
- `improve_proposal_rejected`
- `improve_apply_started`
- `improve_apply_completed`
- `improve_apply_failed`

Attach properties:

- `proposal_kind`
- `risk_level`
- `confidence`
- `scope`
- `verification_status`
- `time_to_apply_ms`

## 11. Phased implementation plan

### Phase 1 (MVP): Proposal system + manual apply

- Add proposal generation endpoint.
- Add Improve UI with proposal review.
- Add manual batch apply with validation gate.

### Phase 2: Better quality and controls

- Add confidence scoring and duplicate-proposal suppression.
- Add per-scope policy configuration.
- Add richer run logs and rollback helpers.

### Phase 3: Controlled autonomy

- Scheduled generation runs.
- Optional auto-apply for low-risk proposals only.
- Canary mode and drift detection.

## 12. Acceptance criteria (MVP)

- User can generate proposals from recent learnings in one action.
- Every proposal includes evidence, risk, confidence, and diff preview.
- User can approve/reject each proposal individually.
- Applying approved proposals runs validation gates.
- Failed applies do not silently mutate additional files.
- Run history is visible and auditable in Hub.
