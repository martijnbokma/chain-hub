/**
 * Inlines public/assets/logos/*.svg into one OG SVG so resvg rasterizes them
 * (external <image href="…svg"> is not reliably supported).
 *
 * Run from apps/web: bun scripts/build-og-svg.ts
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../public");
const outPath = join(__dirname, "og-image.generated.svg");

/** Same order as src/components/sections/Editors.astro */
const ORDERED_LOGOS = [
  "claude-code.svg",
  "cursor.svg",
  "windsurf.svg",
  "gemini.svg",
  "kiro.svg",
  "trae.svg",
  "mistral-vibe.svg",
  "antigravity.svg",
];

const LOGO_FILES = readdirSync(join(publicDir, "assets/logos"))
  .filter(f => f.endsWith(".svg"))
  .sort((a, b) => {
    const ai = ORDERED_LOGOS.indexOf(a);
    const bi = ORDERED_LOGOS.indexOf(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  })
  .map(f => `assets/logos/${f}`);

console.log(`Processing ${LOGO_FILES.length} logos in defined order`);

function extractSvgInner(svg: string): { viewBox: string; inner: string } {
  // Remove XML declaration and comments
  const clean = svg.replace(/<\?xml[^?]*\?>/g, "").replace(/<!--[\s\S]*?-->/g, "").trim();
  const open = clean.match(/<svg\b[^>]*>/);
  if (!open) throw new Error("Expected <svg> root");
  const vbMatch = open[0].match(/\bviewBox="([^"]+)"/);
  const viewBox = vbMatch?.[1] ?? "0 0 24 24";
  const inner = clean.replace(/^[\s\S]*?<svg\b[^>]*>/, "").replace(/<\/svg>\s*$/i, "");
  return { viewBox, inner };
}

function prefixIds(fragment: string, prefix: string): string {
  const ids = new Set<string>();
  // Match id="...", id='...', and potentially id=... without quotes
  for (const m of fragment.matchAll(/\bid=(?:"([^"]+)"|'([^']+)'|([^ >]+))/g)) {
    ids.add(m[1] || m[2] || m[3]!);
  }
  const sorted = [...ids].sort((a, b) => b.length - a.length);
  let out = fragment;
  for (const id of sorted) {
    const nid = `${prefix}${id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    // Replace id definition
    out = out.replaceAll(`id="${id}"`, `id="${nid}"`);
    out = out.replaceAll(`id='${id}'`, `id='${nid}'`);
    // Replace various url(#id) formats
    out = out.replaceAll(`url(#${id})`, `url(#${nid})`);
    out = out.replaceAll(`url('#${id}')`, `url('#${nid}')`);
    out = out.replaceAll(`url("#${id}")`, `url("#${nid}")`);
    // Replace href references
    out = out.replaceAll(`href="#${id}"`, `href="#${nid}"`);
    out = out.replaceAll(`xlink:href="#${id}"`, `xlink:href="#${nid}"`);
  }
  return out;
}

function buildNetwork(): string {
  const centerX = 880;
  const centerY = 315;
  const radius = 240; // Slightly larger radius
  
  const nodes = LOGO_FILES.map((rel, i) => {
    const angle = (i / LOGO_FILES.length) * 2 * Math.PI - Math.PI / 2;
    // Add some jitter for a more "organic" network feel
    const jitterX = Math.cos(i * 1.5) * 25;
    const jitterY = Math.sin(i * 1.5) * 25;
    return {
      x: centerX + Math.cos(angle) * radius + jitterX,
      y: centerY + Math.sin(angle) * radius + jitterY,
      rel,
      i
    };
  });

  const lines = nodes.map(node => {
    return `  <line x1="${centerX}" y1="${centerY}" x2="${node.x}" y2="${node.y}" stroke="rgba(139,124,255,0.15)" stroke-width="2" />`;
  }).join("\n");

  // Inter-node connections for "network" feel
  const meshLines = nodes.map((node, i) => {
    const nextNode = nodes[(i + 1) % nodes.length]!;
    return `  <line x1="${node.x}" y1="${node.y}" x2="${nextNode.x}" y2="${nextNode.y}" stroke="rgba(139,124,255,0.08)" stroke-width="1.5" />`;
  }).join("\n");

  const logoSize = 84; // Slightly larger logos
  const pad = 10; // Slightly less padding

  const logoNodes = nodes.map((node, i) => {
    const raw = readFileSync(join(publicDir, node.rel), "utf8");
    const { viewBox, inner } = extractSvgInner(raw);
    const body = prefixIds(inner, `ogL${i}_`);
    const x = node.x - logoSize / 2;
    const y = node.y - logoSize / 2;
    return `
  <g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
    <circle cx="${logoSize / 2}" cy="${logoSize / 2}" r="${logoSize / 2}" fill="#0d1024" stroke="rgba(139,124,255,0.3)" stroke-width="1.5"/>
    <svg xmlns="http://www.w3.org/2000/svg" x="${pad}" y="${pad}" width="${logoSize - 2 * pad}" height="${logoSize - 2 * pad}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">${body}</svg>
  </g>`;
  }).join("\n");

  return `
  <!-- Network Edges -->
  ${lines}
  ${meshLines}
  
  <!-- Central Node -->
  <g transform="translate(${centerX - 60} ${centerY - 60}) scale(2.2)">
    <rect x="10" y="10" width="36" height="36" rx="12" stroke="#8b7cff" stroke-width="3" fill="#0d1024"/>
    <path d="M21 22L27 28L21 34" stroke="#8b7cff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M31 34H37" stroke="#5ee0a8" stroke-width="3" stroke-linecap="round"/>
  </g>
  
  <!-- Logo Nodes -->
  ${logoNodes}
  `;
}

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by scripts/build-og-svg.ts — run: bun run og:image -->
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
  <defs>
    <linearGradient id="og-bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop stop-color="#070912"/>
      <stop offset="1" stop-color="#0d1024"/>
    </linearGradient>
    <pattern id="og-grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" stroke="rgba(139,124,255,0.06)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#og-bg)"/>
  <rect width="1200" height="630" fill="url(#og-grid)"/>
  
  <g transform="translate(80 140)">
    <text x="0" y="0" fill="#f4f6ff" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" font-size="82" font-weight="800" letter-spacing="-0.03em">Chain Hub</text>
    <text x="0" y="70" fill="#b8a8ff" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" font-size="32" font-weight="500">The orchestration layer for AI agents</text>
    
    <g transform="translate(0 140)">
      <rect width="320" height="54" rx="27" fill="rgba(139,124,255,0.1)" stroke="rgba(139,124,255,0.3)" stroke-width="1.5"/>
      <text x="24" y="34" fill="#8b7cff" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" font-size="20" font-weight="600" letter-spacing="0.05em">BUN INSTALL -G CHAIN-HUB</text>
    </g>
  </g>

  ${buildNetwork()}
</svg>
`;

writeFileSync(outPath, svg, "utf8");
console.log(`Wrote ${outPath}`);
