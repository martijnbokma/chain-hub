import type { CSSProperties } from 'react';

/**
 * Remap the theme tokens to the always-ink "band" surface — descendants keep using
 * the normal utilities (text-foreground, border-border, text-primary) and render
 * correctly on the dark band in either theme. Overrides the flattened --color-*
 * custom properties: Tailwind v4 resolves `var(--foreground)` inside @theme at
 * build time, so overriding --foreground itself would not reach the utilities.
 */
export const BAND_VARS = {
  '--color-foreground': 'var(--band-ink)',
  '--color-muted-foreground': 'var(--band-muted)',
  '--color-border': 'var(--band-line)',
  '--color-primary': '#FF8A5B',
} as CSSProperties;
