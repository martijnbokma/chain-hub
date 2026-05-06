/**
 * Ensures built marketing output stays aligned with CLI adapter symlink targets.
 * Run from apps/web after `bun run build`: `bun run check:adapter-docs`
 */
import { existsSync, readFileSync } from "fs"
import { join } from "path"
import {
  formatMarketingTerminalLine,
  getMarketingSymlinkRows,
} from "../../../cli/adapters/setup-display-paths"

const root = join(import.meta.dir, "..")
const distIndex = join(root, "dist/index.html")
const installSource = readFileSync(join(root, "src/components/sections/Install.astro"), "utf8")
const indexSource = readFileSync(join(root, "src/pages/index.astro"), "utf8")

if (!existsSync(distIndex)) {
  console.error("[check:adapter-docs] dist/index.html missing — run `bun run build` first.")
  process.exit(1)
}

const html = readFileSync(distIndex, "utf8")
const rows = getMarketingSymlinkRows()

for (const row of rows) {
  const termLine = formatMarketingTerminalLine(row)
  if (!html.includes(termLine)) {
    console.error("[check:adapter-docs] dist/index.html missing terminal line:\n", termLine)
    process.exit(1)
  }
  if (!html.includes(row.tildePath)) {
    console.error("[check:adapter-docs] dist/index.html missing symlink path:", row.tildePath)
    process.exit(1)
  }
}

/** Old one-line marketing copy (must not reappear as a full destination line). */
const staleHardcodedSourceLines = [
  "# ✓  Cursor       →  ~/.cursor/rules",
  "# ✓  Gemini CLI   →  ~/.gemini/skills",
  "# ✓  Kiro         →  ~/.kiro/skills",
]

for (const s of staleHardcodedSourceLines) {
  if (installSource.includes(s) || indexSource.includes(s)) {
    console.error("[check:adapter-docs] Stale hardcoded install/hero line in source:", JSON.stringify(s))
    process.exit(1)
  }
}

if (!installSource.includes("chain-setup-display-paths")) {
  console.error("[check:adapter-docs] Install.astro must import chain-setup-display-paths.")
  process.exit(1)
}

if (!indexSource.includes("chain-setup-display-paths") || !indexSource.includes("chain-home-term-json")) {
  console.error("[check:adapter-docs] index.astro must import chain-setup-display-paths and embed chain-home-term-json.")
  process.exit(1)
}

console.log(`[check:adapter-docs] OK — ${rows.length} symlink row(s) present in dist and sources wired to adapters.`)
