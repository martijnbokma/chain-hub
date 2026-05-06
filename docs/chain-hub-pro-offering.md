# Chain Hub Pro Offering

Planning baseline for offering Chain Hub Pro as an add-on on top of Chain Pro.

## 1. Product packaging and tiers

Chain Hub Pro should launch as a tiered add-on with clear boundaries and upgrade paths.

### Tier model

- `Hub Pro Team`
  - Target: small teams that want shared Hub capabilities without enterprise controls
  - Billing unit: seat-based (or seat bundle for smaller invoices)
  - Included: core Pro features, standard support SLA
- `Hub Pro Business`
  - Target: growing teams with governance and higher reliability needs
  - Billing unit: seat-based with higher limits and optional annual commitment
  - Included: Team plus governance, stronger admin controls, faster support SLA
- `Hub Pro Enterprise`
  - Target: larger orgs with procurement, legal, and strict compliance requirements
  - Billing unit: contract/invoice (typically annual)
  - Included: Business plus custom limits, dedicated support path, procurement-friendly terms

### Scope boundary (Chain Pro vs Chain Hub Pro)

- Chain Pro stays the baseline product and must remain usable without Hub Pro.
- Chain Hub Pro gates advanced collaboration, governance, and premium operational capabilities.
- Entitlement checks should only apply to Pro-specific capabilities, never to baseline data ownership or data export.

## 2. Entitlement and license lifecycle

Use a hybrid model:

- Cloud entitlement service is the source of truth for active subscriptions and feature flags.
- Local CLI/offline path uses signed, time-bound tokens so teams can keep working in controlled offline environments.

### Canonical entitlement schema

- `workspace_id`
- `plan_tier` (`team`, `business`, `enterprise`)
- `seats`
- `status` (`active`, `past_due`, `grace`, `suspended`, `cancelled`)
- `renewal_date`
- `grace_period_days`
- `offline_token_expiry`
- `feature_flags` (optional per workspace for staged rollouts)

### Entitlement state transitions

1. Purchase or upgrade sets workspace to `active`.
2. Failed renewal moves to `past_due`.
3. Retry period failure moves to `grace`.
4. End of grace moves to `suspended`.
5. Reactivation returns to `active`.

### Grace and suspension behavior

- During `grace`: keep Pro features available with warnings.
- During `suspended`: Pro-only features become read-only where feasible.
- Never hard-lock core workspace content because of Hub Pro entitlement expiration.

## 3. Payments, billing, invoicing

### MVP payment methods

- Self-serve: cards + bank debit rails (`SEPA`/`ACH` where available).
- Enterprise: invoice billing with approval-friendly payment windows.

### Billing logic

- Billing cycles: monthly and annual.
- Annual plan discount should be explicit and stable.
- Invoice should separate:
  - base Chain Pro line item
  - Chain Hub Pro add-on line item
- Proration applies for:
  - seat count changes mid-cycle
  - activating/deactivating Hub Pro mid-cycle

### Dunning and collections

- Retry policy: 3 attempts with staged reminders.
- Grace period: recommended 7-14 days.
- At grace end: downgrade to suspended Pro entitlement, keep base product access.

### Tax and compliance

- Use billing-provider tax calculation for VAT/sales tax.
- Ensure invoice metadata supports:
  - business details
  - VAT IDs where required
  - downloadable finance-ready invoices

## 4. Update lifecycle and rollout policy

Chain Hub Pro updates should use controlled channels with explicit compatibility checks.

### Update channels

- `stable`: default for all production workspaces.
- `early-access`: opt-in for selected customers or design partners.

### Update flow

1. Cloud service publishes available version and compatibility metadata.
2. CLI checks entitlement and compatibility against installed Chain Pro/CLI version.
3. Eligible workspace receives update prompt or automated policy action.
4. Install verifies signature/integrity and records update event.
5. Offline setups use signed update manifests plus valid offline entitlement token.

### Rollout strategy

- Canary first (internal + selected customers).
- Progressive rollout: 10% -> 50% -> 100%.
- Hard rollback switch if error/incident thresholds are breached.

### Compatibility contract

- Every Chain Hub Pro release must declare minimum supported Chain Pro/CLI version.
- Unsupported combinations must fail with actionable guidance, not silent degradation.

## 5. Support, operations, and license administration

### Support model by tier

- `Hub Pro Team`: standard response SLA.
- `Hub Pro Business`: faster SLA and higher-priority triage.
- `Hub Pro Enterprise`: priority support route with named escalation path.

### Admin capabilities

- Manage seats and tier changes.
- Activate/deactivate add-on.
- Manage billing contact and invoice access.
- View license and entitlement audit events.

### Core operational runbooks

- Failed payment runbook.
- Cloud/local entitlement mismatch runbook.
- Upgrade/downgrade runbook including feature-impact matrix.
- Incident rollback runbook for faulty releases.

## 6. Main-product integration and commercial launch

### In-product integration

- Show add-on discovery where users hit natural Pro boundaries.
- Offer 14-day trial with clear trial end behavior.
- Notify admins before trial expiry and after conversion failure.

### KPI framework

- Attach rate: Chain Pro workspaces activating Chain Hub Pro.
- Trial-to-paid conversion rate.
- Hub Pro churn rate.
- Failed payment rate.
- Support tickets per 100 active Pro workspaces.

### Launch checklist

- Final pricing and packaging page copy.
- Add-on terms and legal review (`TOS`/`DPA` as needed).
- Billing and invoice FAQ for customers.
- Internal support macros and escalation matrix.

## 7. UX spec: Add skill (apps/hub)

Goal: let non-technical users install internet-available skills in under 60 seconds with high confidence and low risk.

### UX principles

- One primary action: `Add skill`.
- One decision per step (no dense forms).
- Safe-by-default: security checks are automatic and visible.
- Plain language first, technical details optional.
- Always recoverable: clear cancel/undo and retry paths.

### Placement and visibility

- Primary button in top bar of the Skills view: `Add skill`.
- Secondary CTA in empty state: `Add your first skill`.
- Optional quick action in sidebar under `Skills`: `+ Add skill`.
- Keep label consistent everywhere (`Add skill`), no alternate wording.

### End-to-end flow (3 steps)

1. `Find`
2. `Review`
3. `Install`

Progress indicator must be persistent: `Step 1 of 3`, `Step 2 of 3`, `Step 3 of 3`.

#### Step 1: Find

Purpose: help users select a skill without prior technical knowledge.

UI elements:

- Search field with helper text: `What do you want to do?`
- Category chips: `Writing`, `Code`, `Research`, `Automation`, `Team`.
- Suggested cards (`Popular`, `Beginner-friendly`, `Verified`).
- Result card preview: name, short outcome-focused description, trust badge.

Microcopy:

- Title: `Find a skill`
- Subtitle: `Describe your task and we will suggest safe options.`
- Input placeholder: `e.g. summarize meeting notes`
- Empty result text: `No match yet. Try a simpler description.`

#### Step 2: Review

Purpose: build trust before installation with minimal cognitive load.

UI elements:

- Skill detail card:
  - Name + version
  - Publisher/author
  - Last updated
  - Install count or usage signal
  - Trust badge (`Verified`, `Review needed`, `Blocked`)
- Permissions panel in plain language:
  - `Can read local files`
  - `Can run shell commands`
  - `Needs internet access`
- Expandable `Technical details` accordion (optional).

Microcopy:

- Title: `Review safety and source`
- Subtitle: `We checked this skill before installation.`
- Trust badges:
  - `Verified` (green): `Source and integrity checks passed`
  - `Review needed` (amber): `Install possible, but requires confirmation`
  - `Blocked` (red): `Not installable due to security policy`
- CTA:
  - Primary: `Install safely`
  - Secondary: `Choose another skill`

#### Step 3: Install

Purpose: complete installation with guided, transparent progress.

UI elements:

- Checklist progress with live statuses:
  1. `Downloading package`
  2. `Verifying integrity and signatures`
  3. `Running security scan`
  4. `Checking compatibility`
  5. `Activating skill`
- Success panel with next actions.
- Failure panel with precise corrective actions.

Microcopy:

- Title: `Installing skill`
- Status text: `This usually takes less than a minute.`
- Success title: `Skill installed`
- Success subtitle: `You can use it right away.`
- Success actions:
  - `Use skill now`
  - `View quick guide`
  - `Undo install`
- Failure title: `Installation paused`
- Failure subtitle: `We found an issue and blocked unsafe setup.`
- Failure actions:
  - `Try again`
  - `Choose alternative`
  - `View details`

### Security model (default behavior)

Install path should enforce:

- Trusted registry by default (allowlisted sources).
- Integrity/signature verification before activation.
- Vulnerability and policy checks before activation.
- Compatibility check against local `chain`/hub version.
- Script-execution guardrails for untrusted installs.

Implementation-aligned checks:

- npm: use audit and signature verification flow (`npm audit`, `npm audit signatures`) as part of pre-activation checks.
- pnpm: enforce deterministic lockfile behavior for packaged installs and support script blocking when risk policy requires it (`--frozen-lockfile`, `--ignore-scripts`).

If any blocking check fails, installation must stop before activation.

### States and behavior contract

Required states:

- Idle
- Searching
- Search results
- No results
- Review (verified)
- Review (review needed)
- Review (blocked)
- Installing (in progress)
- Install success
- Install failure (retryable)
- Install failure (blocked)

Interaction rules:

- Disable primary CTA while checks/install are in-flight.
- Never hide a blocked reason; always show a human-readable cause.
- Preserve user context on back navigation (query, selected filters).
- Keep the wizard dismissible, but show `Installation in progress` warning before close.

### Accessibility and clarity requirements

- Keyboard-first wizard navigation (`Tab`, `Enter`, `Esc`).
- Visible focus styles on every interactive element.
- Status updates announced via aria-live region.
- Badge colors must include text/icon distinction (not color-only meaning).
- Reading level target: CEFR A2-B1 style sentences.

### Minimal component inventory (apps/hub)

- `AddSkillButton`
- `AddSkillWizard`
- `SkillSearchPanel`
- `SkillResultCard`
- `SkillTrustBadge`
- `SkillPermissionList`
- `SkillInstallProgress`
- `SkillInstallResult`

### Analytics and safety telemetry

Track:

- `add_skill_opened`
- `add_skill_search_submitted`
- `add_skill_selected`
- `add_skill_review_confirmed`
- `add_skill_install_started`
- `add_skill_install_succeeded`
- `add_skill_install_failed`
- `add_skill_install_blocked`
- `add_skill_undo`

Attach properties:

- `skill_slug`
- `source_type` (`trusted_registry`, `external_url`)
- `trust_level` (`verified`, `review_needed`, `blocked`)
- `failure_stage` (if any)
- `time_to_install_ms`

### Acceptance criteria (MVP)

- User can install a verified skill in <= 3 clicks after selection.
- Time from `Install safely` to success is <= 60 seconds in normal conditions.
- Blocked skills cannot be activated under any circumstance.
- Every failure state provides at least one safe next action.
- First-time users can complete flow without opening technical docs.

## 8. Implementation split (apps/hub)

This section translates the UX spec into a build order with concrete file-level ownership.

### Phase order (recommended)

1. UI shell + wizard scaffolding
2. Read-only search and review data flow
3. Secure install API and progress wiring
4. Error handling, undo, and telemetry
5. Accessibility polish and end-to-end verification

### File-by-file implementation map

Create or update these files in `apps/hub/src`:

- `components/skills/AddSkillButton.astro`
  - Primary trigger in Skills page header + empty state reuse.
  - Emits open action for wizard modal/drawer.
- `components/skills/AddSkillWizard.astro`
  - Owns 3-step state (`find`, `review`, `install`).
  - Owns progress label (`Step X of 3`) and back/close behavior.
- `components/skills/SkillSearchPanel.astro`
  - Search input, category chips, result list container.
  - Debounced query dispatch to `/api/skills/search`.
- `components/skills/SkillResultCard.astro`
  - Card UI for result rows (`name`, `summary`, `trust badge`).
  - Select action passes chosen `skill_slug` to wizard.
- `components/skills/SkillTrustBadge.astro`
  - Normalized rendering for `verified`, `review_needed`, `blocked`.
  - Includes icon + text label (not color-only).
- `components/skills/SkillPermissionList.astro`
  - Plain-language permission summary for review step.
  - Optional details accordion for technical metadata.
- `components/skills/SkillInstallProgress.astro`
  - Renders install pipeline stages and active/fail state.
  - Announces updates via aria-live region.
- `components/skills/SkillInstallResult.astro`
  - Success/failure end-state actions (`Use now`, `Undo install`, `Try again`).

Update these route/page files:

- `pages/skills.astro` (or active Skills route)
  - Mount `AddSkillButton` in page header.
  - Include wizard root and pass initial context (user/workspace).
- `pages/api/skills/search.ts`
  - Proxy search to trusted registry source(s).
  - Return normalized result model for UI cards.
- `pages/api/skills/review.ts`
  - Returns detailed metadata + trust verdict + permission summary.
- `pages/api/skills/install.ts`
  - Starts install job and streams/provides progress events.
- `pages/api/skills/install/[jobId].ts`
  - Poll endpoint for current install stage/status (if not using SSE).
- `pages/api/skills/uninstall.ts`
  - Supports one-click undo for newly installed skills.

If existing hub API conventions use different directories, keep naming but preserve endpoint responsibilities above.

### API contracts (MVP)

`POST /api/skills/search`

- Input: `{ query: string, categories?: string[] }`
- Output:
  - `{ results: Array<{ skill_slug, name, summary, trust_level, source_type }> }`

`POST /api/skills/review`

- Input: `{ skill_slug: string }`
- Output:
  - `{ skill_slug, version, author, updated_at, trust_level, trust_reason, permissions: string[], install_recommendation }`

`POST /api/skills/install`

- Input: `{ skill_slug: string, source_type: "trusted_registry" | "external_url" }`
- Output:
  - `{ job_id: string, status: "started" }`

`GET /api/skills/install/:jobId`

- Output:
  - `{ status, stage, progress, error_code?, error_message?, can_retry }`
- Stage enum:
  - `downloading`
  - `verifying_integrity`
  - `security_scan`
  - `compatibility_check`
  - `activating`
  - `done`
  - `failed`
  - `blocked`

`POST /api/skills/uninstall`

- Input: `{ skill_slug: string }`
- Output: `{ status: "ok" }`

### Security enforcement points

Enforce on server side (never UI-only):

- Source allowlist check before download.
- Signature/integrity verification before activation.
- Vulnerability/policy checks before activation.
- Compatibility check against active `chain` and hub versions.
- Hard stop on `blocked` status; never partially activate.

Log an audit event for each transition:

- `install_started`
- `install_verified`
- `install_blocked`
- `install_failed`
- `install_succeeded`
- `uninstall_completed`

### Suggested delivery sequence (PR-sized)

- PR 1: UI skeleton (`AddSkillButton`, `AddSkillWizard`, static mocked data)
- PR 2: Search + review APIs and real data binding
- PR 3: Install job endpoint + progress component wiring
- PR 4: Failure/blocked UX + undo endpoint + telemetry events
- PR 5: A11y pass + E2E happy/blocked flows + documentation updates

### Verification checklist

- Functional:
  - Verified skill installs end-to-end.
  - Blocked skill cannot be activated.
  - Retry path works for transient failures.
  - Undo removes freshly installed skill cleanly.
- UX:
  - Flow is understandable without technical vocabulary.
  - All steps have clear heading, instruction, and next action.
- A11y:
  - Full keyboard navigation works.
  - Screen reader announces install stage changes.
  - Contrast and focus states meet baseline requirements.
- Observability:
  - All analytics events fire once per transition.
  - Install duration metric is captured for success/failure.

