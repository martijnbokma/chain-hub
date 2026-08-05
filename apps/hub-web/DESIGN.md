---
name: Chain Hub v2
description: Local-first AI workspace control plane — a cool, premium product app that feels simple, trustworthy, and easy to use.
colors:
  primary: "#F97316"
  accent: "#F4F4F5"
  background: "#FAFAFA"
  surface: "#FFFFFF"
  muted: "#F4F4F5"
  text-primary: "#18181B"
  text-secondary: "#71717A"
  border: "#E4E4E7"
  success: "#10b981"
  warning: "#f59e0b"
  destructive: "#ef4444"
typography:
  display:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.25
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    letterSpacing: "0.14em"
rounded:
  control: "10px"
  card: "12px"
  pill: "9999px"
spacing:
  base: "8px"
  gap: "12px"
  card-padding: "16px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.control}"
    height: "2.25rem"
    padding: "0 0.875rem"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.control}"
    height: "2.25rem"
    padding: "0 0.875rem"
  badge-accent:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.625rem"
---

# Design System: Chain Hub v2

## Overview

**Creative North Star: "Cool Trust"**

Chain Hub v2 is a light, premium product surface: zinc neutrals, white panels, and a single orange signal for the one action that matters. It should feel closer to a polished admin product (clear, calm, credible) than a marketing landing page or a dark terminal console.

**Key Characteristics:**
- Cool zinc/near-white neutrals; one orange accent
- Inter for UI type; JetBrains Mono only for literal values (paths, IDs, step indices)
- Tight radii (10px controls / 12px surfaces) — never stadium cards
- Subtle resting elevation; content width constrained for readable line length
- Status sits next to content; primary actions are `w-fit`, never full-bleed by default

## Colors

### Primary
- **Signal Orange** (`#F97316`): primary action, active nav, focus ring, tinted badges
- **Accent surface** (`#F4F4F5`): hover/selected fills for menus and list rows (not brand orange)

### Neutral
- **Page** (`#FAFAFA`): app background
- **Surface** (`#FFFFFF`): cards, sidebar, popovers
- **Muted** (`#F4F4F5`): secondary fills, current-row tint
- **Ink** (`#18181B`): primary text
- **Slate** (`#71717A`): secondary text
- **Border** (`#E4E4E7`): hairlines

### Named Rules
**The One Signal Rule.** Orange appears only on the primary action, active nav, and focus rings.

**The Tinted-Opacity Badge Rule.** Status badges use low-opacity fills (`border-{hue}-500/20`, `bg-{hue}-500/10`, `text-{hue}-700`).

## Typography

### Hierarchy
- **Page title** (`text-xl font-semibold`): one per screen
- **Row / card title** (`text-sm font-medium` or `font-semibold`)
- **Body** (`text-sm leading-5`)
- **Meta** (`text-xs text-muted-foreground`)
- **Eyebrow** (`text-[11px] uppercase tracking-[0.14em]`): at most one per major page section
- **Mono literal** (`font-mono text-xs`): paths, IDs, step numbers

### Named Rules
**The Eyebrow Budget.** Do not put an eyebrow above every card or list row. Prefer a single page-level eyebrow.

## Layout

- Sidebar + inset main content; mobile sheet below `768px`
- Main padding `px-4 py-4` → `sm:px-6 sm:py-6`
- Prefer `max-w-3xl` for checklist / reading flows
- Spacing scale only: `gap-2`, `gap-3`, `gap-4`, `gap-6`, `gap-8`

## Elevation & Depth

- **Resting**: soft dual shadow (`shadow-card`)
- **Popover**: medium lift
- **Overlay**: dialogs / sheets

## Shapes

- Controls: `10px` (`rounded-xl`)
- Surfaces: `12px` (`rounded-2xl` token maps to 12px)
- Badges / command chips: `rounded-full`

## Alerts

Inline callouts use `Alert` (`default` | `warning` | `destructive`) with the tinted-opacity badge recipe. Prefer `Alert` over ad-hoc bordered banners.

## Loading

Page-level loading uses `PageSkeleton` variants (`checklist` | `dashboard` | `workspace`) matching the three surface types. Inline panels use `Skeleton`.

## Do's and Don'ts

### Do
- Use semantic tokens only (`bg-background`, `text-foreground`, `border-border`, …)
- Keep orange rare (One Signal Rule)
- Prefer divided lists / stacks over stacks of soft cards for sequential content
- Keep primary buttons `w-fit` unless a form footer truly needs full width

### Don't
- Don't use 40px / pill stadium cards on wide layouts
- Don't use parchment/cream neutrals or a second saturated accent
- Don't put marketing-length headlines on utility screens
- Don't full-bleed primary CTAs inside list rows
