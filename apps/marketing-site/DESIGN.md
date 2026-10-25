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
    surface: "#fbfaf8"
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
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "normal"
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
    backgroundColor: "{colors.signal}"
    textColor: "{colors.signal-ink}"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
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
- One accent, spent on structure: the signal ink marks the signal path and the primary action, nothing else.
- Flat and precise: no shadows, no gradients, no rounded-soft chrome; corners stay near-sharp.
- Real proof over invented mockups: product screenshots are framed as drawing details ("Fig. 1", "Fig. 2"), never illustrated.

## Colors

Two-tone ground with a single signal ink; every other color is a neutral step between the two. The palette is the brand's **Signaal** set in both directions: ink ground `#1c1d1f` with paper text `#f2f0eb` and accent-bright `#ff8a5b` in dark mode; paper ground `#f2f0eb` with ink text `#1c1d1f` and accent `#d9482b` in light mode. Both token sets live in `src/styles.css` (`:root` = paper, `.dark` = ink).

### Primary
- **Signal** (`#ff8a5b`, brand accent-bright): the one active ink. Used for the schematic's signal lines and connection dots, corner ticks on proof/detail panels, the primary CTA, and link/heading accents. Never used as a background wash.

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
- **Display** (700, `clamp(2.75rem, 6vw, 4.5rem)`, 0.95 line-height, uppercase): hero and section-closing headlines only.
- **Title** (600, 1.125–1.5rem, uppercase, tracked wide): component/panel names (asset kinds, CLI, Hub Dashboard).
- **Body** (400, 1–1.125rem, 1.625 line-height): paragraph copy, max ~60ch measure.
- **Label** (400, 0.6875rem/11px, 0.1em tracking, uppercase, mono): standalone captions that read on their own line — section headings, titleblock metadata, figure captions.
- **Label Small** (400, 0.625rem/10px, 0.1em tracking, uppercase, mono): dense inline reference tags sitting beside an icon and a heading (`REF 01`, `DETAIL A`), where the 11px step reads too heavy.

### Named Rules
**The Sheet-Header Rule.** Every section opens with one `SectionHead` block: a numbered mono index (`NN · kicker`) directly above a sentence-case display heading that ends in a signal-orange period, with the section's descriptive copy alongside on wide screens. The index and heading form a single unit — never an eyebrow floating free of its heading, and never a heading without its number.

## Layout

Single-column content capped at `max-w-6xl` (72rem), left-aligned, with generous vertical rhythm (`py-16`–`py-20` between sections, always more space above a heading than below it). The hero is the one two-column exception: copy and CTA on the left, the hub-to-editors schematic on the right, collapsing to a stacked column under `lg`. Section boundaries are drawn with a single hairline `border-b`, never a background-color change — sections are separated the way drawing sheets are separated, by a ruled line.

## Elevation & Depth

Flat. No `box-shadow` anywhere in the system. Depth and grouping are conveyed entirely by hairline borders and orange corner ticks (`bp-corners`) marking a panel as "instrumented" (proof figures, legend table, detail panels). The page ground stays empty graphite — no wallpaper grid — so the schematic and ruled sections carry the blueprint metaphor without texture clutter.

### Named Rules
**The No-Shadow Rule.** Structure is drawn, never lit. A panel is bounded by a line, not a blur.

## Shapes

Corners stay near-sharp (`rounded-sm`, 4px) everywhere — buttons, panels, inputs, the schematic's own node rectangles. The one recurring ornament is `bp-corners`: a 9px orange bracket at the top-left and bottom-right of a panel, marking it as an instrumented/measured region (the legend table, the two surface-detail panels, the proof figures). Plain content panels (nothing to "measure") stay bracket-free.

## Components

### Buttons
- **Shape:** 4px corners (`rounded-sm`), no shadow.
- **Primary:** solid signal (`#ff8a5b`) background, ink text, `12px 24px` padding. Used once per section, for the one primary action.
- **Hover:** opacity drops to 90% — no color shift, no lift.
- **Secondary:** transparent fill, hairline border, hover shifts the border to the ring color (signal).

### Legend Table (signature component)
Replaces the generic icon-card grid: a single bordered, orange-bracketed panel containing one row per asset kind, divided by hairlines. Each row reads `REF NN` (mono) → icon → name (display, uppercase) → description, left-to-right, like a bill-of-materials line item. Chosen specifically to avoid the same-size icon/heading/text card pattern that AI-generated marketing pages default to.

### Detail Panels
Two side-by-side (stacking on mobile) orange-bracketed panels labeled `DETAIL A` / `DETAIL B` in the mono label style, each with an icon, display-caps name, one-line tagline, and a `>`-prefixed bullet list in mono+sans. Used exactly once, for the CLI/Dashboard pair — not a general card pattern.

### Framed Figure (signature component)
A real product screenshot inside an orange-bracketed frame, captioned below in the mono label style as `Fig. N — [description]`, echoing a technical drawing's detail callout. Screenshots are real dashboard captures, never illustrated mockups.

### Hub Schematic (signature component)
The hero's inline SVG, drawn as a framed sheet: hairline sheet frame with mono corner annotations (`SHEET 1/1 · LOCAL-FIRST`, `SCALE 1:1`, `ONE HUB · STILL ONE COPY`), the brand mark left of center, and six curved signal wires flowing to circular editor nodes — one per editor adapter in `packages/storage/src/adapters/`. Each wire carries a continuously travelling dash flow (`bp-flow`) and each node pulses (`bp-pulse`) — the signal is alive, not static. A faint foreground trace sits under each signal wire as the "idle" state. Respects `prefers-reduced-motion` (static wires, no pulse).

### Section Reveal
Content blocks inside each section fade up 16px when scrolled into view (IntersectionObserver adds `.in`, `reveal` class in `styles.css`). Reduced-motion users get the end state instantly.

### Band (signature surface)
A theme-independent ink surface (`--band`, always near-black) used twice: the "With Chain Hub" half of the problem comparison, and the full-width "Bring your own model" section — a deliberate dark interruption on the paper theme, a slightly sunken plate on the ink theme. Content inside sets `BAND_VARS` (`src/pages/landing/bandVars.ts`), which remaps the flattened `--color-*` custom properties so normal utilities (`text-foreground`, `border-border`, `text-primary`) resolve to band values — note that Tailwind v4 inlines `var()` references inside `@theme` at build time, so overriding `--foreground` alone does nothing.

### Comparison Panels
The "problem" section's before/after pair: a plain hairline-bordered panel holding the drift table (one chip per editor, name + stale version in mono) beside an orange-bracketed `bp-corners` panel holding the hub path and the linked-editor chip grid. The left panel stays bracket-free — only the hub side is "instrumented". Signal dots on the linked chips mark live connections, consistent with the schematic's endpoint dots.

### Step Cards + CopyCommand
The "how it works" trio: three hairline-bordered cards, each with a numbered mono header row (`01`–`03` in signal ink + an uppercase role label), a display-caps title, one line of copy, and a `CopyCommand` chip — a bordered mono command line (`~ $` prompt in signal ink) with a copy button that swaps Copy → Check for 1.5s. Used exactly once, for clone/init/setup.

### Inputs
- **Style:** panel-surface background, hairline border, mono placeholder text.
- **Focus:** border shifts to the ring color (orange), no glow.

### Navigation
A single titleblock header bar: the drawn brand lockup (inline `LogoLockup` SVG — same paths as `logo-lockup.svg` but stroked in `currentColor` so it follows the theme) on the left, mono nav links (Why / What / How anchors + Docs) and the Sun/Moon theme toggle on the right, separated from the page by one hairline rule.

## Do's and Don'ts

### Do:
- **Do** keep orange to signal lines, corner ticks, and the one primary action per section — its scarcity is the point (The One Ink Rule).
- **Do** draw new sections as ruled sheet regions (`border-b`, hairline dividers) rather than background-color blocks.
- **Do** route any new "many similar things" content through a table/legend-row pattern before reaching for a card grid.
- **Do** caption any new product screenshot in the mono `Fig. N —` style, inside an orange-bracketed frame.

### Don't:
- **Don't** add a wallpaper grid or schematic texture behind sections — the empty sheet is intentional; blueprint language lives in the hub schematic, mono labels, and corner ticks, not in a background pattern.
- **Don't** add a shadow anywhere; depth is drawn with hairlines, never blurred (The No-Shadow Rule).
- **Don't** place a mono index label anywhere except as part of the `SectionHead` unit (The Sheet-Header Rule) — a section header is index + heading + copy together, never an eyebrow floating free.
- **Don't** reach for the same-size icon+heading+text card grid for a new list of features; it was deliberately replaced once already (see Legend Table).
- **Don't** round corners past 4px (`rounded-sm`) — the sharp corner is part of the technical-drawing character.
