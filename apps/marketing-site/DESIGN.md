---
name: Chain Hub Marketing Site
description: Control Plane Blueprint — the hub-to-editors schematic as the marketing surface
colors:
  ground: "#1c1d1f"
  surface: "#242629"
  surface-sunken: "#2a2c2f"
  ink: "#f2f0eb"
  ink-muted: "#9b9994"
  signal: "#ff8a5b"
  signal-ink: "#1c1d1f"
  hairline: "#36383c"
  light:
    ground: "#f2f0eb"
    surface: "#ffffff"
    surface-sunken: "#e6e3dc"
    ink: "#1c1d1f"
    ink-muted: "#606160"
    signal: "#d9482b"
    signal-ink: "#f2f0eb"
    hairline: "#d8d4cb"
typography:
  display:
    fontFamily: "Geist Variable, Geist, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 6vw, 4.5rem)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Geist Variable, Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Geist Mono Variable, Geist Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    letterSpacing: "0.1em"
  label-sm:
    fontFamily: "Geist Mono Variable, Geist Mono, ui-monospace, monospace"
    fontSize: "0.625rem"
    fontWeight: 400
    letterSpacing: "0.1em"
rounded:
  sm: "4px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    border: "1.5px solid {colors.ink}"
    rounded: "0"
    padding: "12px 24px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    border: "1.5px solid {colors.ink}"
    rounded: "0"
    padding: "12px 24px"
---

# Design System: Chain Hub Marketing Site

## Overview

**Creative North Star: "Control Plane Blueprint"**

Chain Hub is drawn as the schematic it actually is: one hub, numbered signal lines, six editor nodes. The surface borrows its grammar from engineering drawings and patch-bay wiring diagrams — framed drawing sheets, dimension ticks, titleblock stamps, a single signal-orange ink — instead of the dark-gradient-glow hero every AI product ships. This is a deliberate refusal of that category default, confirmed against it directly during the direction round.

The current page is a merge of two directions: the original dark **blueprint** surface and a lighter **editorial paper** mock. The split that makes them cohere: page-level elements are editorial (numbered sheet headers, sentence-case display headings ending in a signal-orange period, generous copy blocks), while component-level elements stay technical (uppercase mono/display panel names, `REF NN`/`DETAIL` designators, hairline annotation). Major content panels carry a 1.5px `--frame` border — solid ink on paper, a stronger hairline on the ink ground.

The site runs two themes of the same Signaal palette: **ink** (dark ground, `#ff8a5b` accent-bright) and **paper** (light ground, `#d9482b` accent). The theme is class-based (`html.dark`), resolved at boot from `localStorage["chain-hub-theme"]` falling back to `prefers-color-scheme`, and toggled from a Sun/Moon button in the titleblock bar; `html.theme-switching` suppresses transitions during the flip so both themes land in one frame. Depth comes from line weight and hairline borders, never shadow. The signal ink is spent deliberately: signal lines, active corners, and calls to action — never as a wash.

**Key Characteristics:**
- Schematic, not decorative: every recurring motif (numbered lines, corner ticks, titleblock stamps, figure captions) is drawn from real technical-drawing convention, not applied as texture.
- One accent, spent on structure: the signal ink marks the signal path and small status/emphasis details, nothing else.
- Flat and precise: no shadows, no gradients, no rounded-soft chrome; corners stay near-sharp.
- Real proof over invented mockups: product screenshots are framed as drawing details ("Fig. 1", "Fig. 2"), never illustrated.

## Colors

Two-tone ground with a single signal ink; every other color is a neutral step between the two. The palette is the brand's **Signaal** set in both directions: ink ground `#1c1d1f` with paper text `#f2f0eb` and accent-bright `#ff8a5b` in dark mode; paper ground `#f2f0eb` with ink text `#1c1d1f` and accent `#d9482b` in light mode. Both token sets live in `src/styles.css` (`:root` = paper, `.dark` = ink). On paper, `--card` panels are pure white (`#ffffff`) — deliberately crisper than the ground, so framed panels read as clean sheets laid on the paper; on ink, `--card` is the `#242629` panel step above the ground.

### Primary
- **Signal** (`#ff8a5b`, brand accent-bright): the one active ink. Used for the schematic's signal lines and connection dots, corner ticks on instrumented panels, status dots, step numbers, the heading period, and link/badge accents. Never used as a background wash — primary buttons are ink on paper, signal on ink.

### Neutral
- **Ink Ground** (`#1c1d1f`, brand inkt): the page background.
- **Panel Surface** (`#242629`): card and framed-figure backgrounds, the hub node fill.
- **Sunken Surface** (`#2a2c2f`): reserved secondary surface (currently unused on this page).
- **Signal Foreground** (`#1c1d1f`): text on the signal primary button.
- **Paper** (`#f2f0eb`, brand papier): primary text and headline color.
- **Paper Muted** (`#9b9994`): body copy, captions, annotation labels.
- **Hairline** (`#36383c`): every border and divider.

### Named Rules
**The One Ink Rule.** The signal ink is the only saturated color on the page. It marks a signal (a wire, a corner, an action) and nothing else — if it's not carrying one of those meanings, it isn't signal.

## Typography

**Display Font:** Geist Variable (with system-ui fallback)
**Body Font:** Geist Variable (with system-ui fallback)
**Label/Mono Font:** Geist Mono Variable (with ui-monospace fallback)

**Character:** Geist — Vercel's dev-tool face — carries headlines and body copy in a restrained, engineered voice; Geist Mono renders every annotation, dimension number, and reference designator, standing in for the hand-lettered notes on a real drawing.

### Hierarchy
- **Display** (600, `clamp(2.25rem–4.5rem)` steps, ~1.02–1.08 line-height, `-0.03em`–`-0.04em` tracking, sentence case): hero, section, and closing headlines — each ends in the signal-orange period.
- **Title** (600, 1.125–1.5rem): component/panel names — sentence case inside the register cells, uppercase tracked for the CLI / Hub Dashboard panel names.
- **Body** (400, 1–1.125rem, 1.625 line-height): paragraph copy, max ~60ch measure.
- **Label** (400, 0.6875rem/11px, 0.1em tracking, uppercase, mono): standalone captions that read on their own line — section headings, titleblock metadata, figure captions.
- **Label Small** (400, 0.625rem/10px, 0.1em tracking, uppercase, mono): dense inline reference tags sitting beside an icon and a heading (`REF 01`, `DETAIL A`), where the 11px step reads too heavy.

### Named Rules
**The Sheet-Header Rule.** Every section opens with one `SectionHead` block: a numbered mono index (`NN · kicker`) directly above a sentence-case display heading that ends in a signal-orange period, with the section's descriptive copy alongside on wide screens. The index and heading form a single unit — never an eyebrow floating free of its heading, and never a heading without its number. Geist's period glyph is square, so the closing period is rendered as a round dot (`SignalPeriod`: em-scaled `rounded-full` dot + `sr-only` ".") — round matches the brand mark's endpoint dot.

## Layout

Single-column content capped at `max-w-6xl` (72rem), left-aligned, with generous vertical rhythm (`py-16`–`py-20` between sections, always more space above a heading than below it). The hero is the one two-column exception: copy and CTA on the left, the hub-to-editors schematic on the right, collapsing to a stacked column under `lg`. Section boundaries are drawn with a single hairline `border-b`, never a background-color change — sections are separated the way drawing sheets are separated, by a ruled line.

## Elevation & Depth

Flat. No `box-shadow` anywhere in the system. Depth and grouping are conveyed entirely by hairline borders and orange corner ticks (`bp-corners`) marking a panel as "instrumented" — currently just the dark "With Chain Hub" comparison panel. The page ground stays empty graphite — no wallpaper grid — so the schematic and ruled sections carry the blueprint metaphor without texture clutter.

### Named Rules
**The No-Shadow Rule.** Structure is drawn, never lit. A panel is bounded by a line, not a blur.

## Shapes

Corners stay near-sharp (`rounded-sm`, 4px) for panels, inputs, chips, and the schematic's node rectangles — buttons are the exception at a fully square 0 radius. The one recurring ornament is `bp-corners`: a 9px orange bracket at the top-left and bottom-right of a panel, marking it as an instrumented/measured region (currently only the "With Chain Hub" comparison panel). Plain content panels (nothing to "measure") stay bracket-free.

## Components

### Buttons
- **Shape:** fully square (0 radius) — the only elements on the page without `rounded-sm`; the hard corner is part of the titleblock character. No shadow.
- **Primary:** solid fill + 1.5px same-color border — ink (`bg-foreground`/`text-background`) on the paper theme, signal (`bg-primary`/`text-primary-foreground`/`border-primary`) on the ink theme, where accent-bright carries the one primary action against the dark ground. Used once per section.
- **Hover:** opacity drops to 90% — no color shift, no lift.
- **Secondary:** transparent fill, 1.5px `border-frame`, hover shifts the border to the ring color (signal).

### Asset Register (signature component)
The "what it holds" section drawn as a parts register: one 1.5px `--frame`-bordered sheet holding a `sm:grid-cols-2 lg:grid-cols-3` grid of cells separated by 1px `--border` hairlines (`gap-px` over a `bg-border` track). Each cell reads like a bill-of-materials entry: authored icon top-left, `REF NN` label-small tag top-right, display name, one-line description, and the mono hub path (`skills/`, `agents/`, …, `chain setup`) as the part number. Cells are flat `bg-card` and fill `--secondary` on hover. This is the sanctioned pattern for "many similar things" — a single framed register, never floating cards.

### Asset Icons (authored set)
`src/pages/landing/AssetIcons.tsx`: six 24px-grid icons drawn for the register — bolt (skills), figure (agents), branch (workflows), shield-check (rules), terminal window (prompts), and a scaled-down hub mark (editor connections). One consistent 2px `currentColor` stroke with rounded caps; each glyph carries a single filled signal dot in `var(--primary)` where it marks the "active" point — on rules the shield's check itself is drawn in `var(--primary)` instead of a dot. Components take `{ size, className }` like lucide icons so they drop into the same slots. The same set (minus the hub mark) powers hub-web via `KIND_META` (`apps/hub-web/src/components/ui/asset-kind-icons.tsx`) — keep the two files in sync.

### Detail Panels
Two side-by-side (stacking on mobile) framed panels, each opening with a split label row — `DETAIL A` / `DETAIL B` left, the role (`The engine`, `The control panel`) right — in the label-small mono style, over a mock strip (terminal transcript or mini dashboard), then an icon + display-caps name, one-line tagline, and a `>`-prefixed bullet list in mono+sans. Used exactly once, for the CLI/Dashboard pair — not a general card pattern.

### Framed Figure (signature component)
A real product screenshot inside an orange-bracketed frame, captioned below in the mono label style as `Fig. N — [description]`, echoing a technical drawing's detail callout. Screenshots are real dashboard captures, never illustrated mockups.

### Hub Schematic (signature component)
The hero's inline SVG, drawn as a framed sheet: hairline sheet frame with mono corner annotations (`SHEET 1/1 · LOCAL-FIRST`, `SCALE 1:1`, `ONE HUB · STILL ONE COPY`), the brand mark left of center, and six curved signal wires flowing to circular editor nodes — one per editor adapter in `packages/storage/src/adapters/`. Each wire carries a continuously travelling dash flow (`bp-flow`) and each node pulses (`bp-pulse`) — the signal is alive, not static. A faint foreground trace sits under each signal wire as the "idle" state. Respects `prefers-reduced-motion` (static wires, no pulse).

### Section Reveal
Content blocks inside each section fade up 16px when scrolled into view (IntersectionObserver adds `.in`, `reveal` class in `styles.css`). Reduced-motion users get the end state instantly.

### Band (signature surface)
A theme-independent ink surface (`--band`, always near-black) used twice: the "With Chain Hub" half of the problem comparison, and the full-width "Bring your own model" section — a deliberate dark interruption on the paper theme, a slightly sunken plate on the ink theme. Content inside sets `BAND_VARS` (`src/pages/landing/bandVars.ts`), which remaps the flattened `--color-*` custom properties so normal utilities (`text-foreground`, `border-border`, `text-primary`) resolve to band values — note that Tailwind v4 inlines `var()` references inside `@theme` at build time, so overriding `--foreground` alone does nothing. `--color-primary-foreground` is also remapped to ink, so accent-filled elements (the `LOCAL` badge) get legible text in both themes. The BYO-model grid on the band is hairline-bordered cells (`border-border`, transparent fill); Ollama carries the signal border as the local recommendation.

### Comparison Panels
The "problem" section's before/after pair, each opening with a split label row (`Without Chain Hub` / `Copy · paste · drift` vs `With Chain Hub` / `One source of truth`). The left panel is plain framed: the drift table is one hairline-bordered chip per editor (name + stale version in mono, never filled). The right panel is an orange-bracketed `bp-corners` band surface holding the brand mark beside the `~/.chain-hub` path and the linked-editor chip grid — each chip is hairline-bordered with a signal dot marking a live connection, consistent with the schematic's endpoint dots. Only the hub side is "instrumented".

### Step Cards + CopyCommand
The "how it works" trio: three frame-bordered cards, each with a numbered header row (`01`–`03` in signal ink left, an uppercase role label right), a body with title + one line of copy, and a `CopyCommand` strip pinned at the bottom — a band-ink mono command line (`~ $` prompt in signal ink) with a copy button that swaps Copy → Check for 1.5s. Used exactly once, for `npm install -g chain-hub` / `chain hub` / `chain setup`.

### Inputs
- **Style:** panel-surface background, hairline border, mono placeholder text.
- **Focus:** border shifts to the ring color (orange), no glow.

### Navigation
A single titleblock header bar: the drawn brand lockup (inline `LogoLockup` SVG — same paths as `logo-lockup.svg` but stroked in `currentColor` so it follows the theme) on the left, nav links (Why / What / How anchors + Docs + GitHub ↗) and the Sun/Moon theme toggle on the right, separated from the page by one hairline rule.

### Hero
Copy column carries a mono label line (`FREE · OPEN SOURCE · LOCAL-FIRST`) over the display headline, then muted sub-copy with key phrases set semibold ink, the primary signal CTA plus a hairline secondary, and a closing note line prefixed by a signal dot (`Free and open source. Nothing leaves your computer.`).

## Do's and Don'ts

### Do:
- **Do** keep orange to signal lines, corner ticks, status dots, and small emphasis details per section — its scarcity is the point (The One Ink Rule). Primary actions are ink, not signal.
- **Do** draw new sections as ruled sheet regions (`border-b`, hairline dividers) rather than background-color blocks.
- **Do** route any new "many similar things" content through the framed register/grid pattern (hairline-divided cells inside one `--frame` border, mono designators) before reaching for separate cards.
- **Do** caption any new product screenshot in the mono `Fig. N —` style, inside an orange-bracketed frame.

### Don't:
- **Don't** add a wallpaper grid or schematic texture behind sections — the empty sheet is intentional; blueprint language lives in the hub schematic, mono labels, and corner ticks, not in a background pattern.
- **Don't** add a shadow anywhere; depth is drawn with hairlines, never blurred (The No-Shadow Rule).
- **Don't** place a mono index label anywhere except as part of the `SectionHead` unit (The Sheet-Header Rule) — a section header is index + heading + copy together, never an eyebrow floating free.
- **Don't** reach for free-floating same-size cards for a list of features; the register grid is the exception precisely because it reads as one framed sheet with designators, not a card grid (see Asset Register).
- **Don't** round corners past 4px (`rounded-sm`) — the sharp corner is part of the technical-drawing character.
