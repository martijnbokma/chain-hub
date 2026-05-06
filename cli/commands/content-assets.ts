import kleur from "kleur"
import { getChainHome } from "../utils/chain-home"
import { UserError } from "../utils/errors"
import {
  createContent,
  deleteContent,
  listContent,
  readContent,
  updateContent,
  type ContentKind,
} from "../services/content-service"

type AssetKind = Exclude<ContentKind, "skills">

interface UpsertOptions {
  content?: string
  ext?: ".md" | ".mdc"
}

function assertAssetKind(kind: string): AssetKind {
  if (kind === "rules" || kind === "agents" || kind === "workflows") {
    return kind
  }
  throw new UserError(`Unsupported asset kind '${kind}'.`)
}

function assertContentText(content: unknown): string {
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new UserError("Provide --content with non-empty markdown.")
  }
  return content
}

function assertRuleExt(kind: AssetKind, ext?: ".md" | ".mdc"): ".md" | ".mdc" | undefined {
  if (!ext) return undefined
  if (kind !== "rules" && ext === ".mdc") {
    throw new UserError("Only rules support --ext .mdc.")
  }
  return ext
}

export async function runAssetList(kindInput: string): Promise<void> {
  const kind = assertAssetKind(kindInput)
  const chainHome = getChainHome()
  const entries = listContent(chainHome, kind).sort((a, b) => Number(a.isCore) - Number(b.isCore) || a.slug.localeCompare(b.slug))

  console.log(kleur.bold(`\n  ${kind} (${entries.length} total)\n`))
  for (const entry of entries) {
    const marker = entry.isCore ? kleur.blue("●") : kleur.green("●")
    const origin = entry.isCore ? kleur.dim("core") : kleur.dim("user")
    const suffix = entry.ext ? kleur.dim(` (${entry.ext})`) : ""
    console.log(`  ${marker} ${entry.slug}  ${origin}${suffix}`)
  }
  console.log()
}

export async function runAssetNew(kindInput: string, slug: string, opts: UpsertOptions): Promise<void> {
  const kind = assertAssetKind(kindInput)
  const chainHome = getChainHome()
  const content = assertContentText(opts.content)
  const ext = assertRuleExt(kind, opts.ext)
  createContent(chainHome, { kind, slug, content, ext })
  console.log(kleur.green(`\n  ✓ Created ${kind.slice(0, -1)} '${slug.trim()}'\n`))
}

export async function runAssetEdit(kindInput: string, slug: string, opts: UpsertOptions): Promise<void> {
  const kind = assertAssetKind(kindInput)
  const chainHome = getChainHome()
  const content = assertContentText(opts.content)
  const existing = readContent(chainHome, kind, slug)
  const ext = assertRuleExt(kind, opts.ext ?? existing.ext)
  updateContent(chainHome, { kind, slug, content, ext })
  console.log(kleur.green(`\n  ✓ Updated ${kind.slice(0, -1)} '${slug.trim()}'\n`))
}

export async function runAssetRemove(kindInput: string, slug: string): Promise<void> {
  const kind = assertAssetKind(kindInput)
  const chainHome = getChainHome()
  deleteContent(chainHome, kind, slug)
  console.log(kleur.green(`\n  ✓ Removed ${kind.slice(0, -1)} '${slug.trim()}'\n`))
}

export async function runAssetRename(kindInput: string, oldSlug: string, newSlug: string): Promise<void> {
  const kind = assertAssetKind(kindInput)
  const chainHome = getChainHome()
  const existing = readContent(chainHome, kind, oldSlug)
  if (existing.isCore) {
    throw new UserError(`'${oldSlug}' is a protected core ${kind.slice(0, -1)} and cannot be renamed.`)
  }
  updateContent(chainHome, {
    kind,
    slug: oldSlug,
    newSlug,
    content: existing.content,
    ext: existing.ext
  })
  console.log(kleur.green(`\n  ✓ Renamed ${kind.slice(0, -1)} '${oldSlug}' to '${newSlug}'\n`))
}

