# Chain Hub Pro Decision Log

Decision log for the four open product decisions required to finalize the Chain Hub Pro commercial rollout.

## 1. Tier boundaries and naming

- **Decision owner:** Product + GTM
- **Status:** Proposed (pending approval)
- **Recommendation:** Keep `Hub Pro Team`, `Hub Pro Business`, `Hub Pro Enterprise`
- **Why this default:**
  - Matches common buyer expectations.
  - Keeps pricing page and sales conversations simple.
  - Supports future packaging without renaming migration overhead.

### Approval checklist

- Confirm final feature matrix per tier.
- Confirm hard limits per tier (seats/workspaces/retention).
- Confirm support SLA mapping per tier.

## 2. Billing unit by tier

- **Decision owner:** Product + Finance
- **Status:** Proposed (pending approval)
- **Recommendation:** Hybrid by segment
  - `Team`: seat-based self-serve
  - `Business`: seat-based self-serve with annual option
  - `Enterprise`: contract + invoice billing
- **Why this default:**
  - Preserves self-serve growth in SMB.
  - Keeps enterprise procurement-friendly.
  - Avoids introducing usage-billing complexity too early.

### Approval checklist

- Confirm minimum seat policy (if any).
- Confirm annual discount percentage and floor.
- Confirm proration rules for mid-cycle seat changes.

## 3. Grace policy after failed payment

- **Decision owner:** Product + Support + Finance
- **Status:** Proposed (pending approval)
- **Recommendation:** `14` days grace, then Pro suspension
  - During grace: Pro features remain available with warnings.
  - After grace: Pro features move to read-only mode.
  - Base Chain Pro access remains available.
- **Why this default:**
  - Balances customer experience with revenue protection.
  - Reduces support friction compared to immediate lockouts.
  - Aligns with the no-hard-lock principle for baseline content.

### Approval checklist

- Confirm retry schedule within grace.
- Confirm exact in-product warning timeline.
- Confirm reactivation behavior on successful recovery.

## 4. Early-access channel policy

- **Decision owner:** Product + Engineering
- **Status:** Proposed (pending approval)
- **Recommendation:** Request-based access in phase 1, optional self-serve later
- **Why this default:**
  - Limits blast radius while update lifecycle matures.
  - Enables controlled canary feedback from design partners.
  - Keeps support and rollback operationally manageable.

### Approval checklist

- Confirm eligibility criteria for early-access.
- Confirm rollback and incident communication process.
- Confirm graduation criteria to wider availability.

## Decision summary table

- `Tier names/boundaries`: proposed, pending sign-off
- `Billing unit per tier`: proposed, pending sign-off
- `Grace policy`: proposed, pending sign-off
- `Early-access policy`: proposed, pending sign-off

## Next governance step

Run a single decision review with Product, Finance, and Engineering and record:

- final choice,
- owner,
- decision date,
- effective date,
- linked rollout milestone.

