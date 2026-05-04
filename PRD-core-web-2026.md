# PRD: Chain Hub — Core, Landing & Docs overhaul
**Datum:** 2026-05-04  
**Status:** Voorstel ter bespreking  
**Scope:** Core skills/agents/workflows/rules + chainhub.one landing + docs

---

## 1. Aanleiding en doel

Chain Hub heeft een solide technisch fundament maar kampt met drie verweven problemen:

1. **Positioneringsdrift** — de landingspagina trekt "marketers en managers" aan, maar het product vereist npm en terminal-vaardigheden. Die mismatch zorgt voor gefrustreerde bezoekers en lage conversie.
2. **Core als leeg canvas** — de core-bundel leert gebruikers *hoe* ze Chain Hub uitbreiden, maar geeft ze niets om direct mee te werken. Ze verlaten de onboarding zonder één concreet nuttige skill.
3. **Documentatie die concepten overslaat** — de docs beschrijven commands maar leggen niet uit *waarom* de abstracties bestaan of hoe het er in de editor uitziet.

**Doel:** Maak Chain Hub begrijpelijk en direct waardevol voor de doelgroep — developers die meerdere AI-editors gebruiken.

---

## 2. Doelgroep (herijkt)

| Primair | Secundair |
|---|---|
| Developer die 2+ AI-editors gebruikt (Claude Code + Cursor, etc.) | Developer die één editor gebruikt maar skills wil delen met team |
| Heeft npm/terminal-comfort | Developer die bestaande regels/prompts wil consolideren |
| Vindt het irritant dat settings per tool uit sync lopen | — |

**Expliciet GEEN doelgroep voor v1:** writers, marketeers, project managers. Het product is een CLI-tool die symlinks zet in `~/.cursor/`, `~/.claude/` etc. Je hebt terminal nodig. Door dit te verzwijgen maken we de landingspagina oneerlijk en de onboarding teleurstellend.

---

## 3. Huidige staat — eerlijk

### 3.1 Core: wat klopt
- `create-skill` is uitstekend geschreven, progressieve disclosure, goede anti-patronen
- `create-rule` dekt alle editors
- `global.md` rule is minimaal en correct
- `find-skills` integreert skills.sh-ecosysteem goed

### 3.2 Core: wat niet klopt

| Probleem | Ernst |
|---|---|
| Geen enkele direct bruikbare skill voor eindgebruikers | Hoog |
| `update-cli-config` dekt Cursor in diepte, Claude Code krijgt "check their docs" | Hoog |
| `onboarding` skill overlapt met `chain-onboarding` agent + `chain-quickstart` workflow | Middel |
| `chain-hub` skill heeft broken relative links (`../../../README.md`) | Middel |
| `shell` skill is 10 regels die een /command doorsluizen — geen echte skill | Laag |
| `cursor-global.mdc` is een lege container die alleen `@global.md` importeert | Laag |

### 3.3 Landing: wat klopt
- Visueel ontwerp is sterk en consistent
- Hero-terminal animatie maakt het mechanisme zichtbaar
- Problem-sectie is eerlijk en herkenbaar
- Editor-grid toont breedte van support

### 3.4 Landing: wat niet klopt

| Probleem | Ernst |
|---|---|
| `LibraryPreview` toont skills die niet bestaan ("Brand Voice Expert", "Contract Reviewer", "SEO Optimizer", "Support Hero") | Hoog — misleidend |
| `UseCases` trekt non-developers aan ("Content & Marketing", "Project Management") terwijl product CLI-only is | Hoog — verkeerde verwachting |
| `SimpleText` toont `brand-voice.md` — past niet bij developer-doelgroep | Middel |
| Comparison-sectie gebruikt emojis (✕, ✓, ✍️, 📋) — inconsistent met minimaal aesthetic | Laag |
| Geen enkele visuele weergave van de CHAIN_HOME-structuur | Middel |
| Geen "wat krijg je out of the box" — core skills zijn onzichtbaar | Middel |

### 3.5 Docs: wat klopt
- Quickstart is helder en kloppend
- Commands-tabel is volledig

### 3.6 Docs: wat niet klopt

| Probleem | Ernst |
|---|---|
| Geen conceptuele uitleg van wat een skill *is* (structuur, voorbeeld) | Hoog |
| Geen "your first skill" — 5-minuten walkthrough | Hoog |
| Geen editor-specifieke voorbeelden (hoe ziet het eruit in Cursor vs Claude Code?) | Middel |
| "New to Chain Hub?" gebruikt "central library" metafoor maar legt mechanisme niet uit | Middel |
| Geen visuele CHAIN_HOME file tree | Middel |
| Thin troubleshooting (alleen wrong-binary) | Laag |

---

## 4. Gewenste eindstaat

> Een developer met twee AI-editors installeert Chain Hub, begrijpt binnen 2 minuten wat het doet en waarom, voert `chain init && chain setup` uit, en ziet direct dat één shared skill nu in beide editors werkt. Ze begrijpen het model zonder de docs te hoeven lezen.

---

## 5. Core — verbeteringen

### 5.1 Verwijder `onboarding` skill
**Reden:** Overlapt met `chain-onboarding` agent en `chain-quickstart` workflow. Drie overlappende assets voor hetzelfde onderwerp. Kies één primary entry point per gebruik-scenario.

**Actie:** Verwijder de skill die net aangemaakt is. Maak `chain-quickstart` workflow de primary first-run guide, en `chain-onboarding` agent de fallback-persona voor open vragen.

### 5.2 Fix `update-cli-config` voor Claude Code
**Reden:** Claude Code is qua marktaandeel de grootste concurrent van Cursor CLI. De skill roteert correct maar geeft Claude Code geen diepte.

**Actie:** Voeg een sectie toe met de meest gebruikte Claude Code settings (`permissions`, `approvalMode`, `hooks`, `env`) op gelijk niveau als de Cursor CLI-sectie.

### 5.3 Fix broken links in `chain-hub`
**Reden:** Links naar `../../../README.md` werken alleen in de monorepo, niet voor npm-gebruikers.

**Actie:** Vervang relative paths door `https://github.com/martijnbokma/chain-hub/blob/main/…` of verwijder de Key References sectie en vervang door `chain status` en `chain --help`.

### 5.4 Voeg 3 developer demonstration skills toe aan core
**Reden:** De core-bundel geeft eindgebruikers niets om direct mee te werken. Dit is de grootste gap.

**Nieuwe skills:**

| Slug | Wat het doet |
|---|---|
| `commit` | Schrijf gestructureerde git commit messages (Conventional Commits). Wordt actief bij `git commit` of "commit this". |
| `debug` | Systematische debugging: reproduce → isolate → fix → guard. Actief bij errors, test failures, "why isn't this working". |
| `code-review` | Vijf-dimensie review (correctness, readability, security, performance, tests). Actief bij "review this", PR-context. |

**Waarom juist deze drie:** Ze zijn universeel, editor-agnostic, en laten zien wat Chain Hub doet — dezelfde skill werkt in Cursor én Claude Code zonder aanpassing.

**Kwaliteitseis:** Elke skill < 200 regels, één concreet voorbeeld per skill, trigger-description die auto-invocatie triggert.

### 5.5 Slim `shell` down of verwijder
**Reden:** 10 regels die `/shell` doorsluizen. Geen echte waarde.

**Actie:** Verwijder uit core. Als `/shell` als CLI-commando geregistreerd is, laat dat in de CLI-code staan zonder aparte skill-file.

### 5.6 Geef `cursor-global.mdc` eigen inhoud of verwijder
**Reden:** Huidige inhoud is alleen `@global.md`. Leeg scaffolding verwarrt gebruikers.

**Actie:** Ofwel voeg Cursor-specifieke conventies toe (bijv. `.mdc` rule-authoring hints, Cursor agent-specifieke instructies), ofwel genereer het file automatisch via `chain setup` in plaats van het in core op te slaan.

### 5.7 Core structuur na wijzigingen

```
core/skills/
  chain-hub/          ← monorepo + CHAIN_HOME referentie (fix broken links)
  code-review/        ← NIEUW: vijf-dimensie code review
  commit/             ← NIEUW: Conventional Commits helper
  create-hook/        ← cross-editor (al geüpdatd)
  create-rule/        ← cross-editor ✓
  create-skill/       ← cross-editor ✓
  create-subagent/    ← cross-editor ✓
  debug/              ← NIEUW: systematische debugging
  find-skills/        ← cross-editor ✓
  migrate-to-skills/  ← cross-editor ✓
  update-cli-config/  ← uitbreiden met Claude Code diepte
  update-editor-settings/ ← cross-editor (al geüpdatd) ✓

core/agents/
  chain-onboarding.md ← primary first-run persona (ongewijzigd)

core/workflows/
  chain-quickstart.md ← primary first-run guide (ongewijzigd)

core/rules/
  global.md           ← uitstekend (ongewijzigd)
  cursor-global.mdc   ← eigen inhoud toevoegen of auto-genereren
```

**Verwijderd uit core:**
- `onboarding` (nieuw, maar overbodig)
- `shell` (te dun)

---

## 6. Landing — verbeteringen

### 6.1 Herijkt positionering — developer-first

**Huidig tagline:** "One brain for all your AI assistants"  
**Probleem:** "Assistants" suggereert ChatGPT/Gemini chat — niet de CLI/IDE-integratie die het product daadwerkelijk biedt.

**Voorstel tagline:** "One hub. Every AI editor."  
**Voorstel subline:** "Chain Hub syncs your skills, rules, and agents across Claude Code, Cursor, Windsurf, Gemini CLI, and more — from a single directory."

Dit is concreter: het noemt *editors* niet *assistants*, en *directory* maakt het technisch eerlijk.

### 6.2 Vervang `LibraryPreview` sectie

**Huidig:** Vier fictieve skill-kaartjes (Brand Voice Expert, Contract Reviewer, SEO Optimizer, Support Hero) die niet bestaan in de core bundel.

**Vervangen door:** "What ships in core" — een visuele weergave van de *echte* core skills die de gebruiker krijgt, inclusief de drie nieuwe:

```
// wat je krijgt na: chain init

◈ create-skill     — scaffold a new skill
◈ create-rule      — add rules for all editors  
◈ create-hook      — hooks for Cursor + Claude Code
◈ commit           — structured commit messages
◈ debug            — systematic debugging
◈ code-review      — five-axis code review
  + 6 more…
```

Dit is eerlijker en waardevoller: de gebruiker ziet *echte* waarde.

### 6.3 Vervang `UseCases` sectie

**Huidig:** Content & Marketing, Project Management, Expert Guidelines — voor non-developers.

**Vervangen door:** Developer-use-cases die *aansluiten bij de echte doelgroep*:

| Use case | Wat Chain Hub doet |
|---|---|
| Je gebruikt Cursor op werk, Claude Code thuis | Eén hub, beide synced — dezelfde code-review skill, overal |
| Je team wil gedeelde code-stijl-regels | `global.md` in één repo, `chain setup` distribueert naar elk teamlid |
| Je wisselt per project van editor | `CHAIN_HOME` volgt je, niet je editor |
| Je hebt 20 prompts verspreid over notities en editors | `migrate-to-skills` converteert ze in één keer |

### 6.4 Vervang `SimpleText` sectie

**Huidig:** `brand-voice.md` voorbeeld — past niet bij developer-doelgroep.

**Vervangen door:** Een developer-relevant voorbeeld:

```markdown
# skills/debug/SKILL.md

---
name: debug
description: Systematic debugging. Use when you hit an error,
  test failure, or unexpected behavior.
---

## Steps
1. Reproduce the issue with a minimal case
2. Read the full stack trace before guessing
3. Isolate: is it the data, the logic, or the environment?
4. Fix the root cause, not the symptom
5. Add a test that catches this regression
```

En een tweede panel dat laat zien: *"Dit bestand werkt nu in Cursor én Claude Code — tegelijk."*

### 6.5 Voeg CHAIN_HOME-architectuur visualisatie toe

**Huidig:** Geen visuele weergave van het model. Gebruikers begrijpen niet *hoe* de sync werkt.

**Voorstel:** Een visueel between `HowItWorks` en `Editors` dat het model uitlegt:

```
~/chain-hub/              ← jouw hub (één plek)
  skills/
    debug/SKILL.md
    commit/SKILL.md
  rules/
    global.md
  
  ↓ chain setup            ← één commando

~/.claude/skills/         ← Claude Code ziet het
~/.cursor/rules/          ← Cursor ziet het  
~/.gemini/skills/         ← Gemini CLI ziet het
```

Dit is het "aha-moment" dat het product verkoopt. Het moet *visueel* zijn, niet alleen tekst.

### 6.6 Fix Comparison-sectie

**Huidig:** Gebruikt emojis (✕, ✓, ✍️) die niet passen bij het minimale monospace aesthetic.  
**Actie:** Vervang emojis door het al aanwezige typografische systeem (genummerde items, accent-kleur, tekst).

### 6.7 Sectievolgorde na wijzigingen

```
Hero            ← licht aanscherpen: "every AI editor" ipv "assistants"
Problem         ← blijft (goed)
HowItWorks      ← blijft (goed)
Architecture    ← NIEUW: visuele CHAIN_HOME → editors diagram
Editors         ← blijft (goed)
WhatYouGet      ← VERVANG LibraryPreview: echte core skills
UseCases        ← VERVANG: developer use cases
SkillsAnatomy   ← blijft, update voorbeeld naar developer-context
SimpleText      ← VERVANG voorbeeld: brand-voice → debug skill
CliReference    ← blijft (goed)
Install         ← blijft (goed)
Faq             ← blijft
Footer          ← blijft
```

---

## 7. Docs — verbeteringen

### 7.1 Voeg "What is a skill?" conceptuele sectie toe

**Huidig:** De docs springen direct naar quickstart zonder uit te leggen wat een skill structureel is.

**Toevoegen na "New to Chain Hub?":**

```markdown
## What is a skill?

A skill is a folder with one file: SKILL.md.

skills/
  debug/
    SKILL.md      ← markdown with YAML frontmatter

The frontmatter tells the agent WHEN to use it.
The body tells the agent HOW to behave.
```

Inclusief een interactief voorbeeld van frontmatter + body met uitleg van elk veld.

### 7.2 Voeg "Your first skill in 5 minutes" toe

**Stap-voor-stap walkthrough:**
1. `chain new my-skill` — maak een skill aan
2. Open `~/chain-hub/skills/my-skill/SKILL.md` in je editor
3. Schrijf je instructies (template al aanwezig)
4. `chain validate` — check frontmatter
5. In je editor: probeer de skill aan te roepen

Dit mist volledig in de huidige docs en is het belangrijkste leermoment voor nieuwe gebruikers.

### 7.3 Voeg editor-specifieke setup-voorbeelden toe

**Voor elk supported editor:** Hoe ziet de skill eruit na `chain setup`?

```
Claude Code:  ~/.claude/skills/debug/SKILL.md ✓
Cursor:       ~/.cursor/skills/debug/SKILL.md ✓
Windsurf:     ~/.codeium/windsurf/skills/debug/SKILL.md ✓
```

En een screenshot/terminal-snippet die bewijst dat het werkt.

### 7.4 Visuele CHAIN_HOME file tree

**Huidig:** Enkel tekst over waar bestanden leven.

**Toevoegen:** Een ASCII file tree met uitleg per onderdeel — dezelfde structuur als het Landing architecture-diagram maar met meer detail.

### 7.5 Verbeter "New to Chain Hub?" introductie

**Huidig:** "Think of Chain Hub as a central library for everything your AI assistants need to know."

**Probleem:** "Central library" is te abstract en suggereert een web-interface die er niet is.

**Voorstel:** Concreter en technisch eerlijk:

> Chain Hub is a directory on your machine (`~/chain-hub`) that syncs to every AI editor you use. You write instructions once as Markdown files. `chain setup` creates symlinks so Cursor, Claude Code, Windsurf, and others load them automatically. Update a file in your hub — every editor picks it up instantly.

### 7.6 Docs TOC na wijzigingen

```
- New to Chain Hub?       ← rewrite (concreter)
- Quickstart              ← blijft
- What is a skill?        ← NIEUW (conceptueel + voorbeeld)
- Your first skill        ← NIEUW (5-minuten walkthrough)
- Hub layout              ← NIEUW: visuele file tree
- Editor setup            ← NIEUW: per-editor links en verificatie
- Keeping up to date      ← blijft
- Adding content          ← licht herschrijven
- Core concepts           ← herschrijven (concreter)
- Commands                ← blijft
- Local dev               ← blijft
- Troubleshooting         ← uitbreiden
```

---

## 8. Visuele voorbeelden — specificaties

Chain Hub verkoopt een *mechanisme* (sync via symlinks), niet een interface. Visuele voorbeelden moeten dat mechanisme tastbaar maken.

### Visual 1: Architecture flow (landing + docs)
**Wat:** Verticale flow: `~/chain-hub/skills/debug/SKILL.md` → pijl omlaag → drie doelen: `~/.claude/skills/debug/SKILL.md`, `~/.cursor/skills/debug/SKILL.md`, `~/.gemini/skills/debug/SKILL.md`  
**Stijl:** Monospace, donker, accent-kleur op de pijlen — aansluitend bij het huidige design  
**Formaat:** Statische Astro-component (geen external SVG nodig)

### Visual 2: Before/After (landing Comparison)
**Huidig:** Tekst-lijst met bullets  
**Voorstel:** Twee gesplitste terminals:
- Links: 5 tabs open, elke editor heeft andere instructies, allemaal uit sync
- Rechts: één `~/chain-hub/` directory, drie editors groen

### Visual 3: Skill anatomy (docs)
**Wat:** Geannoteerde SKILL.md met callouts:
- `name:` → "hoe de skill wordt opgeslagen"
- `description:` → "wanneer de AI hem kiest"
- `# body` → "wat de AI doet"  
**Formaat:** Statische code-block met gekleurde highlights (CSS, geen library nodig)

### Visual 4: File tree (docs Hub layout)
**Wat:** Interactieve of statische file tree met hover-tooltips:
```
~/chain-hub/
  core/           ← bundled, read-only
  skills/         ← your skills (edit here)
    debug/
      SKILL.md
  rules/
    global.md
  agents/
  workflows/
  skills-registry.yaml
```
**Formaat:** Statische Astro-component met monospace styling

---

## 9. Wat we NIET gaan doen

- De doelgroep uitbreiden naar non-developers — het product is een CLI-tool
- ChatGPT of web-based AI tools noemen als supported (ze zijn het niet)
- Animaties of zware JavaScript toevoegen — de `is:inline` script aanpak blijft
- Een echte database of CMS voor de skills-gallery — statische content is voldoende
- De LibraryPreview vullen met externe registry-data — te vroeg en te fragiel
- **Volledig autonoom** skills/rules/agents overschrijven in `core/` of in iemands `CHAIN_HOME` **zonder** `chain validate` + menselijke of PR-review — te risicovol voor kwaliteit en security

---

## 10. Prioriteit en volgorde

### Fase 1 — Core foundation (nu, 1-2 sessies)
1. Verwijder `onboarding` skill en `shell` skill uit core
2. Fix broken links in `chain-hub` skill
3. Voeg `commit`, `debug`, `code-review` skills toe aan core
4. Update `update-cli-config` met Claude Code diepte
5. Update `registry.yaml`

### Fase 2 — Docs (1 sessie)
6. "What is a skill?" sectie toevoegen
7. "Your first skill" walkthrough toevoegen
8. Visuele file tree toevoegen
9. "New to Chain Hub?" rewrite
10. Editor-specifieke setup-voorbeelden toevoegen

### Fase 3 — Landing (1-2 sessies)
11. Tagline aanscherpen
12. `LibraryPreview` → `WhatYouGet` (echte core skills)
13. `UseCases` → developer use cases
14. `SimpleText` voorbeeld → debug skill
15. Architecture-visual toevoegen (nieuwe Astro-component)
16. Comparison-sectie emojis vervangen

### Fase 4 — Polish (1 sessie)
17. `cursor-global.mdc` beslissing: eigen inhoud of auto-genereren
18. Consistency check: alle skill-descriptions triggeren correct
19. Volledige test: onboarding van 0 → werkende skill in editor

### Fase 5 — Self-learning hub gardener (later; na stabiele core + docs)
20. Harden `learnings/` paden (`getLearningsDir` altijd submappen; robuuste `reflect` inbox-parse)
21. Skill + workflow `hub-gardener` (of uitbreiding `chain-hub`): vaste promptlus draft → validate → voorstel patches
22. Optioneel: geplande run (cron / CI) die `chain reflect --dry-run` + agent alleen **PR** laat openen tegen de monorepo — nooit silent merge naar `main`

---

## 11. Succes-criteria

| Criterium | Hoe te meten |
|---|---|
| Een developer met 2 editors snapt het model zonder docs | Informele gebruikerstest: 2 min op landing, begrijpen ze de file-tree visual? |
| Core geeft direct waarde na `chain init` | `commit`, `debug`, `code-review` werken zonder configuratie |
| Alle core skills zijn cross-editor | Elke skill getest in Cursor + Claude Code |
| Landing beschrijft wat het product echt doet | Geen "writers en managers" in use cases |
| Docs hebben een "5 minuten first skill" pad | Compleet pad: `chain new` → edit → validate → gebruik in editor |

---

## 12. Self-learning hub gardener — doelarchitectuur

**Intentie:** Een **doorlopende verbeterlus** waarbij een agent Chain Hub en je bibliotheek **gestuurd** beter maakt — niet door blind alles te overschrijven, maar door **signalen → distill → review → veilige apply**.

### 12.1 Twee scopes (expliciet gescheiden)

| Scope | Wat mag de agent wijzigen | Kwaliteitspoort |
|--------|---------------------------|-----------------|
| **A. Persoonlijke hub** (`CHAIN_HOME`: `skills/`, `rules/`, `agents/`, `workflows/`, `learnings/`) | Ja, na interne checks | `chain validate` + diff in chat; overlays onder `learnings/shared/<slug>/OVERLAY.md` voor incrementele aanpassingen op bestaande skills |
| **B. Upstream monorepo** (`core/`, CLI, site) | Alleen via **PR** (mens of bot) | CI (`bun test`, `pack:check`, web build) + maintainer-review |

Standaard draait de gardener primair op **scope A**; scope **B** is opt-in (bijv. wekelijkse “upstream hygiene” run met expliciet token).

### 12.2 Datalijn (bestaand + uitbreiding)

1. **Signalen:** `chain capture`, hooks (bijv. na sessie), of toekomstige structured events → `learnings/queue/inbox.jsonl`.
2. **Distill:** `chain reflect` (of `--dry-run`) → markdown in `learnings/drafts/`; inbox naar `learnings/archive/`.
3. **Agent-stap (nieuw als workflow):** Lees laatste draft + relevante `SKILL.md` / rules; stel concrete edits voor; voer **`chain validate`** uit voordat iets wordt gecommit.
4. **Apply:** Gebruiker approve’t patches, of PR-bot opent een branch.

### 12.3 Wat “constant verbeteren” praktisch betekent

- **Kort cycli:** bijv. dagelijks of na elke dev-sessie: lege inbox = niets doen; anders één distill-run + één agent-pass.
- **Bundel-bescherming:** Gebundelde `core/` in de npm-package blijft **alleen** veranderen via repo-PR’s, zodat gebruikers geen silent drift krijgen bij `chain update`.
- **Provenance:** Wijzigingen aan registry/GitHub-skills blijven via bestaande `skills-registry.yaml` + credits model lopen.

### 12.4 Minimale deliverables (Fase 5)

| # | Deliverable |
|---|-------------|
| 1 | Robuuste `cli/utils/learnings.ts`: altijd `queue/`, `drafts/`, `archive/`, `shared/` aanmaken; lege regels skippen; duidelijke fout bij corrupte JSONL |
| 2 | Core **workflow** `hub-gardener` (of agent): checklist — reflect → lees draft → validate → voorstel diffs (geen merge zonder expliciete stap) |
| 3 | Documentatie in `/docs`: één pagina “Continual learning” die deze lus uitlegt naast `capture` / `reflect` |

### 12.5 Optioneel (niet verplicht voor v1 van deze lus)

- **Cursor SDK** of headless agent in CI: zelfde prompt, output = patch of `gh pr create`.
- **Semantische merge** van OVERLAY’s in volledige `SKILL.md` — alleen na expliciete “promote” door gebruiker.

Dit sluit aan op `chain capture` / `chain reflect` zoals ze nu bestaan: de PRD voegt **governance, scopes en een named workflow** toe zodat “zelflerend” **beheersbaar** blijft.
