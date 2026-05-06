import { mkdirSync } from "fs"
import { homedir, tmpdir } from "os"
import { join } from "path"
import { allAdapters } from "./index"

/** Same order as the marketing site hero / install blocks */
const MARKETING_ADAPTER_ORDER = [
  "Windsurf",
  "Cursor",
  "Claude Code",
  "Antigravity",
  "Gemini CLI",
  "Mistral Vibe",
  "Trae",
  "Kiro",
  "Universal (Internal & Agents)",
] as const

export interface MarketingSymlinkRow {
  editor: string
  description: string
  tildePath: string
  /** Shown after the path for scope clarifications (e.g. Gemini + Universal) */
  scopeNote?: string
}

let fakeChainHomeCache: string | null = null

/**
 * Minimal hub tree so adapters that gate on `exists(from)` (e.g. Claude memory)
 * return the same links as a real initialized hub.
 */
function getFakeChainHomeForDocs(): string {
  if (fakeChainHomeCache) return fakeChainHomeCache
  const root = join(tmpdir(), `chain-hub-docs-link-stub-${process.pid}`)
  mkdirSync(join(root, "skills"), { recursive: true })
  mkdirSync(join(root, "agents"), { recursive: true })
  mkdirSync(join(root, "workflows"), { recursive: true })
  mkdirSync(join(root, "memory"), { recursive: true })
  mkdirSync(join(root, "rules"), { recursive: true })
  fakeChainHomeCache = root
  return root
}

function toTildePath(absolutePath: string): string {
  const h = homedir()
  if (absolutePath === h) return "~"
  if (absolutePath.startsWith(h + "/")) return `~${absolutePath.slice(h.length)}`
  return absolutePath
}

function scopeNoteForRow(editor: string, isFirstGeminiRow: boolean): string | undefined {
  if (editor === "Gemini CLI" && isFirstGeminiRow) {
    return "(skills: ~/.agents/skills via Universal)"
  }
  return undefined
}

/**
 * Symlink destinations shown on chainhub.one — derived from `allAdapters` link targets.
 */
export function getMarketingSymlinkRows(): MarketingSymlinkRow[] {
  const chainHome = getFakeChainHomeForDocs()
  const byName = new Map(allAdapters.map((a) => [a.name, a]))
  const rows: MarketingSymlinkRow[] = []
  let seenGemini = false

  for (const name of MARKETING_ADAPTER_ORDER) {
    const adapter = byName.get(name)
    if (!adapter) continue
    for (const link of adapter.links(chainHome)) {
      const isFirstGemini = adapter.name === "Gemini CLI" && !seenGemini
      if (adapter.name === "Gemini CLI") seenGemini = true
      rows.push({
        editor: adapter.name,
        description: link.description,
        tildePath: toTildePath(link.to),
        scopeNote: scopeNoteForRow(adapter.name, isFirstGemini),
      })
    }
  }

  return rows
}

const LABEL_PAD = 34

/** Hero / terminal-style line (leading spaces + check + padded label + arrow + path) */
export function formatMarketingTerminalLine(row: MarketingSymlinkRow): string {
  const label = `${row.editor} (${row.description})`.padEnd(LABEL_PAD)
  let line = `  ✓  ${label}→  ${row.tildePath}`
  if (row.scopeNote) line += `  ${row.scopeNote}`
  return line
}

/** Green `# ✓ …` lines in the Install section */
export function formatInstallCommentLine(row: MarketingSymlinkRow): string {
  return `# ${formatMarketingTerminalLine(row)}`
}

export type HomeTerminalItem =
  | { type: "cmd"; text: string }
  | { type: "out"; text: string; cls: string }
  | { type: "blank" }
  | { type: "cur" }

export function buildHomePageTerminalScriptItems(): HomeTerminalItem[] {
  const items: HomeTerminalItem[] = [
    { type: "cmd", text: "chain setup" },
    { type: "out", text: "  Scanning for installed IDEs…", cls: "text-text-dim" },
  ]
  for (const row of getMarketingSymlinkRows()) {
    items.push({ type: "out", text: formatMarketingTerminalLine(row), cls: "text-green" })
  }
  items.push({ type: "blank" })
  items.push({
    type: "out",
    text: "  Hub linked. Core + connections ready — build your library (chain new, chain add …).",
    cls: "text-accent",
  })
  items.push({ type: "cur" })
  return items
}
