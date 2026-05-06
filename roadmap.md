# Aanbevolen scope voor het volgende epic

Op basis van de huidige staat van Chain Hub zijn er vier natuurlijke richtingen.

**Status-legenda:** `Geïmplementeerd` | `Gedeeltelijk` | `Open`

## Richting 1 — Registry & discovery uitbreiding

- [Open] `commit`, `debug` en `code-review` toevoegen zodat ze via `chain add` installeerbaar zijn
- [Open] Registry-pagina op de website (`chainhub.one/registry`) met zoekfunctie
- [Open] `chain search`-resultaten verbeteren met betere ranking

## Richting 2 — Premium skill packs (aparte track)

- [Gedeeltelijk] Skill-pack infrastructuur: apart npm-pakket, eigen versioning, `chain add --pack`
- [Geïmplementeerd] Eerste premium pack definiëren (bijv. TypeScript-specifiek, React of Python)
- [Open] Billing/access-model bepalen (los van `core/`)

### Huidige status (mei 2026)

- [Gedeeltelijk] `chain add github:<owner>/<repo> --pack` installeert skills en registreert onder `packs`
- [Gedeeltelijk] pack-specifieke versioning via `chain-hub-pro/pack.yaml` (niet via npm-releaseflow)
- [Geïmplementeerd] Eerste premium pack bestaat als private `chain-hub-pro` repository met skills + companion assets
- [Open] Apart npm-pakket voor Pro pack-delivery
- [Open] Billing/licentie-flow buiten GitHub-toegang

### Volgende milestones (concreet)

- **M1 — CLI pack-manifest ondersteuning**
  - Laat `chain add ... --pack` `pack.yaml` lezen
  - Installeer naast `skills/` ook `agents/`, `workflows/` en `rules/` volgens manifest
  - Voeg regressietests toe voor manifest parsing + install-contract
- **M2 — Delivery model kiezen en vastzetten**
  - Keuze A: private GitHub-only (huidig model, verbeterde DX)
  - Keuze B: apart npm-pakket (`@chain-hub/pro-pack`) met semver en publish-pipeline
  - Beslismoment: onderhoudslast, toegang en enterprise-verwachtingen
- **M3 — Access/billing MVP**
  - Definieer entitlement-bron (GitHub org/team, licentie-token of Stripe-backed licentieservice)
  - Voeg `chain pro login` + `chain pro status` (of equivalent) toe
  - Blokkeer pack-update/install met heldere foutmelding bij ontbrekende entitlement
- **M4 — Release en update policy**
  - Contract: core blijft open-source track, Pro pack updatebaar op eigen cadence
  - Versiecompatibiliteitsmatrix: minimale `chain` CLI-versie per Pro pack-release
  - Operator-runbook: install, update, rollback

### Definition of done voor Richting 2

- `chain add --pack` levert een complete pack-install zonder handmatige companion-sync
- Pro pack heeft eigen versie- en releaseproces, los van `core/`
- Access-model is technisch afgedwongen (niet alleen private repo-toegang)
- Documentatie voor install/update/troubleshooting staat in docs + Pro-repo-workflow

## Chain Hub Pro Monetization & Delivery

### Positionering en packaging (besliskader)

- [Open] Chain Hub Pro positioneren als **tiered add-on** bovenop Chain Pro (`Hub Pro Team`, `Hub Pro Business`, `Hub Pro Enterprise`)
- [Open] Per tier expliciet vastleggen: featuregrenzen, seat/workspace-limieten, retention, support-SLA
- [Open] Segmentkeuze bevestigen: Team/Business self-serve, Enterprise contractueel

### Entitlements en licenties (hybride model)

- [Open] Hybride entitlement-model formaliseren: cloud als bron + offline CLI fallback met tijdgebonden tokens
- [Open] Entitlement-velden vastzetten: `workspace_id`, `plan_tier`, `seats`, `status`, `renewal_date`, `grace_period_days`, `offline_token_expiry`
- [Open] Grace policy definiëren (duur + gedrag na expiratie): Pro-functies read-only, geen hard lock van basisdata

### Billing, betaalmethoden en facturatie

- [Open] MVP betaalmethoden: kaart + SEPA/ACH voor self-serve, invoice billing voor enterprise
- [Open] Facturatielogica vastleggen: maand/jaar, proratie bij seatwijziging en mid-cycle add-on activatie
- [Open] Dunning en retries uitwerken: 3-level retry, reminders, grace window, downgradepad
- [Open] Belasting/compliance requirements per regio documenteren (o.a. EU-btw, bedrijfsgegevens)

### Updates, uitrol en compatibiliteit

- [Open] Releasekanalen vastzetten: `stable` (default) + optioneel `early-access`
- [Open] Rolloutstrategie implementeren: canary intern/design partners, daarna 10% -> 50% -> 100% met rollback switch
- [Open] Updatecontract vastleggen: Chain Hub Pro release compatibel met specifieke Chain Pro/CLI versies
- [Open] Offline update-pad documenteren met signed manifest en entitlement-validatie

### Operations, support en launch readiness

- [Open] Supportmodel per tier finaliseren met responstijden en escalatiepad
- [Open] Runbooks afronden: failed payment, entitlement mismatch (cloud/local), upgrade/downgrade impact
- [Open] In-product activatieflow specificeren: contextuele upsell, 14-daagse trial, automatische trial-expiry
- [Open] KPI-set voor GTM en operations activeren: attach rate, trial->paid, churn, failed payment rate, tickets per 100 workspaces
- [Open] Juridische/commerciële launch artifacts opleveren: add-on terms, pricing FAQ, facturatie FAQ
- [Open] Beslisronde afronden op basis van `docs/chain-hub-pro-decision-log.md` (4 open productkeuzes)

## Richting 3 — Multi-hub & teamondersteuning

- [Open] Gedeelde hub voor teams: `chain init --shared` of team-registry
- [Open] `skills-registry.yaml` uitbreiden met team-bucket
- [Open] Conflictresolutie bij overlappende skills tussen personal en team

## Richting 4 — Chain Hub UI (web dashboard)

- [Open] Visuele hub-manager in de browser
- [Open] Skills bekijken, bewerken en installeren zonder CLI
- [Open] Integratie met `chain status`-output
