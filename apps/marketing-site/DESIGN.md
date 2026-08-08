---
name: Chain Hub Marketing Site
description: Control Plane Blueprint — the hub-to-editors schematic as the marketing surface
colors:
  ground: "#0d1318"
  surface: "#141c23"
  surface-sunken: "#1b2a33"
  ink: "#e8eef2"
  ink-muted: "#93a2af"
  signal: "#f97316"
  signal-ink: "#ffffff"
  hairline: "#2a3844"
typography:
  display:
    fontFamily: "Big Shoulders Display Variable, Big Shoulders Display, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 6vw, 4.5rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "normal"
  body:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "JetBrains Mono Variable, JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    letterSpacing: "0.1em"
  label-sm:
    fontFamily: "JetBrains Mono Variable, JetBrains Mono, ui-monospace, monospace"
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

Chain Hub is drawn as the schematic it actually is: one hub, numbered signal lines, four editor nodes. The surface borrows its grammar from engineering drawings and patch-bay wiring diagrams — hairline grids, dimension ticks, titleblock stamps, a single signal-orange ink — instead of the dark-gradient-glow hero every AI product ships. This is a deliberate refusal of that category default, confirmed against it directly during the direction round.

The site commits to one dark, graphite ground (no light mode toggle exists yet; the light tokens in `src/styles.css` are the shared Cool Trust base carried over from the hub-web dashboard but are currently unused on this surface). Depth comes from line weight and hairline borders, never shadow. Orange is spent deliberately: signal lines, active corners, and calls to action — never as a wash.

**Key Characteristics:**
- Schematic, not decorative: every recurring motif (numbered lines, corner ticks, titleblock stamps, figure captions) is drawn from real technical-drawing convention, not applied as texture.
- One accent, spent on structure: orange marks the signal path and the primary action, nothing else.
- Flat and precise: no shadows, no gradients, no rounded-soft chrome; corners stay near-sharp.
- Real proof over invented mockups: product screenshots are framed as drawing details ("Fig. 1", "Fig. 2"), never illustrated.

## Colors

Two-tone graphite ground with a single signal-orange ink; every other color is a neutral step between the two.

### Primary
- **Signal Orange** (`#f97316`): the hub's one active ink. Used for the schematic's signal lines and connection dots, corner ticks on proof/detail panels, the primary CTA, and link/heading accents. Never used as a background wash.

### Neutral
- **Graphite Ground** (`#0d1318`): the page background.
- **Panel Surface** (`#141c23`): card and framed-figure backgrounds, the hub node fill.
- **Sunken Surface** (`#1b2a33`): reserved secondary surface (currently unused on this page; carried from the shared token set).
- **Signal Foreground** (`#ffffff`): text on the orange primary button.
- **Ink** (`#e8eef2`): primary text and headline color.
- **Ink Muted** (`#93a2af`): body copy, captions, annotation labels.
- **Hairline** (`#2a3844`): every border, divider, and grid line.

### Named Rules
**The One Ink Rule.** Orange is the only saturated color on the page. It marks a signal (a wire, a corner, an action) and nothing else — if it's not carrying one of those meanings, it isn't orange.

## Typography

**Display Font:** Big Shoulders Display Variable (with system-ui fallback)
**Body Font:** Inter Variable (with system-ui fallback)
**Label/Mono Font:** JetBrains Mono Variable (with ui-monospace fallback)

**Character:** A condensed, industrial-signage display face carries headlines like stamped titleblock lettering; Inter stays quiet and legible for reading copy; JetBrains Mono renders every annotation, dimension number, and reference designator, standing in for the hand-lettered notes on a real drawing.

### Hierarchy
- **Display** (700, `clamp(2.75rem, 6vw, 4.5rem)`, 0.95 line-height, uppercase): hero and section-closing headlines only.
- **Title** (600, 1.125–1.5rem, uppercase, tracked wide): component/panel names (asset kinds, CLI, Hub Dashboard).
- **Body** (400, 1–1.125rem, 1.625 line-height): paragraph copy, max ~60ch measure.
- **Label** (400, 0.6875rem/11px, 0.1em tracking, uppercase, mono): standalone captions that read on their own line — section headings, titleblock metadata, figure captions.
- **Label Small** (400, 0.625rem/10px, 0.1em tracking, uppercase, mono): dense inline reference tags sitting beside an icon and a heading (`REF 01`, `DETAIL A`), where the 11px step reads too heavy.

### Named Rules
**The No-Kicker Rule.** A section's mono label heading stands alone as the heading — it never pairs with a separate display headline above the same section. One heading per section, no duplicated announcement.

## Layout

Single-column content capped at `max-w-6xl` (72rem), left-aligned, with generous vertical rhythm (`py-16`–`py-20` between sections, always more space above a heading than below it). The hero is the one two-column exception: copy and CTA on the left, the hub-to-editors schematic on the right, collapsing to a stacked column under `lg`. Section boundaries are drawn with a single hairline `border-b`, never a background-color change — sections are separated the way drawing sheets are separated, by a ruled line.

## Elevation & Depth

Flat. No `box-shadow` anywhere in the system. Depth and grouping are conveyed entirely by hairline borders, the `bp-grid` hairline background, and orange corner ticks (`bp-corners`) marking a panel as "instrumented" (proof figures, legend table, detail panels).

### Named Rules
**The No-Shadow Rule.** Structure is drawn, never lit. A panel is bounded by a line, not a blur.

## Shapes

Corners stay near-sharp (`rounded-sm`, 4px) everywhere — buttons, panels, inputs, the schematic's own node rectangles. The one recurring ornament is `bp-corners`: a 9px orange bracket at the top-left and bottom-right of a panel, marking it as an instrumented/measured region (the legend table, the two surface-detail panels, the proof figures). Plain content panels (nothing to "measure") stay bracket-free.

## Components

### Buttons
- **Shape:** 4px corners (`rounded-sm`), no shadow.
- **Primary:** solid signal orange (`#f97316`) background, white text, `12px 24px` padding. Used once per section, for the one primary action.
- **Hover:** opacity drops to 90% — no color shift, no lift.
- **Secondary:** transparent fill, hairline border, hover shifts the border to the ring color (orange).

### Legend Table (signature component)
Replaces the generic icon-card grid: a single bordered, orange-bracketed panel containing one row per asset kind, divided by hairlines. Each row reads `REF NN` (mono) → icon → name (display, uppercase) → description, left-to-right, like a bill-of-materials line item. Chosen specifically to avoid the same-size icon/heading/text card pattern that AI-generated marketing pages default to.

### Detail Panels
Two side-by-side (stacking on mobile) orange-bracketed panels labeled `DETAIL A` / `DETAIL B` in the mono label style, each with an icon, display-caps name, one-line tagline, and a `>`-prefixed bullet list in mono+sans. Used exactly once, for the CLI/Dashboard pair — not a general card pattern.

### Framed Figure (signature component)
A real product screenshot inside an orange-bracketed frame, captioned below in the mono label style as `Fig. N — [description]`, echoing a technical drawing's detail callout. Screenshots are real dashboard captures, never illustrated mockups.

### Hub Schematic (signature component)
The hero's inline SVG: a hub node (rounded rect, orange 2px stroke) trunk-and-bus wired to four editor nodes (hairline-bordered rects) via orange 2px signal lines, each branch numbered `01`–`04` in mono. On load, lines draw in (`stroke-dashoffset` animation) and nodes fade up in sequence, trunk first — the one authored motion moment on the page, standing in for a signal reaching each editor. Respects `prefers-reduced-motion` (snaps to end state).

### Inputs
- **Style:** panel-surface background, hairline border, mono placeholder text.
- **Focus:** border shifts to the ring color (orange), no glow.

### Navigation
A single titleblock header bar: a bordered `CH` mark plus the wordmark on the left, separated from the page by one hairline rule. No nav links — this is a single-page launch surface.

## Do's and Don'ts

### Do:
- **Do** keep orange to signal lines, corner ticks, and the one primary action per section — its scarcity is the point (The One Ink Rule).
- **Do** draw new sections as ruled sheet regions (`border-b`, hairline dividers) rather than background-color blocks.
- **Do** route any new "many similar things" content through a table/legend-row pattern before reaching for a card grid.
- **Do** caption any new product screenshot in the mono `Fig. N —` style, inside an orange-bracketed frame.

### Don't:
- **Don't** add a shadow anywhere; depth is drawn with hairlines, never blurred (The No-Shadow Rule).
- **Don't** stack a small mono eyebrow above a large display headline in the same section (The No-Kicker Rule) — the section's mono label is the heading, not an announcement above one.
- **Don't** reach for the same-size icon+heading+text card grid for a new list of features; it was deliberately replaced once already (see Legend Table).
- **Don't** round corners past 4px (`rounded-sm`) — the sharp corner is part of the technical-drawing character.
