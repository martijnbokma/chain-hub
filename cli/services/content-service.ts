import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs"
import { basename, extname, join } from "path"
import { readProtectedCoreAssets } from "../registry/core"
import { ensureCoreAssets, ensureUserRegistry } from "../utils/core-assets"
import { UserError } from "../utils/errors"
import { assertSafeSkillPathSegment, assertValidSkillSlug } from "../utils/skill-slug"

export type ContentKind = "skills" | "rules" | "agents" | "workflows"
type ContentFileExt = ".md" | ".mdc"

export interface ContentListEntry {
  kind: ContentKind
  slug: string
  isCore: boolean
  path: string
  ext?: ContentFileExt
}

export interface ContentReadResult {
  kind: ContentKind
  slug: string
  isCore: boolean
  content: string
  path: string
  ext?: ContentFileExt
}

export interface ContentWriteInput {
  kind: ContentKind
  slug: string
  content: string
  ext?: ContentFileExt
}

function ensureInitialized(chainHome: string): void {
  ensureCoreAssets({ chainHome })
  ensureUserRegistry({ chainHome })
}

function assertContentKind(kind: string): ContentKind {
  if (kind === "skills" || kind === "rules" || kind === "agents" || kind === "workflows") {
    return kind
  }
  throw new UserError(`Invalid content kind '${kind}'.`)
}

function isProtected(chainHome: string, kind: ContentKind, slug: string): boolean {
  const protectedAssets = readProtectedCoreAssets(chainHome)
  return protectedAssets[kind].includes(slug)
}

function assertSafeSlug(slug: string): string {
  return assertSafeSkillPathSegment(slug)
}

function assertCreateSlug(kind: ContentKind, slug: string): string {
  if (kind === "skills") return assertValidSkillSlug(slug)
  return assertSafeSlug(slug)
}

// Resolves a rule file by slug, trying extensions in preference order.
// Returns the matched path+ext or null if neither extension exists.
function resolveRuleBySlug(baseDir: string, slug: string, preferredExt?: ContentFileExt): { path: string; ext: ContentFileExt } | null {
  const preferred = preferredExt === ".mdc" ? [".mdc", ".md"] : [".md", ".mdc"]
  for (const ext of preferred) {
    const filePath = join(baseDir, `${slug}${ext}`)
    if (existsSync(filePath)) return { path: filePath, ext }
  }
  return null
}

// Resolves the canonical SKILL.md path inside a skill directory.
function resolveSkillPath(baseDir: string, slug: string): string {
  return join(baseDir, slug, "SKILL.md")
}

// Resolves a flat single-file path (agents, workflows, or rules with explicit ext).
function resolveFlatPath(baseDir: string, slug: string, ext: ContentFileExt = ".md"): string {
  return join(baseDir, `${slug}${ext}`)
}

// Returns the base directory for a given kind, selecting core vs user subtree.
function kindBaseDir(chainHome: string, kind: ContentKind, isCore: boolean): string {
  return isCore ? join(chainHome, "core", kind) : join(chainHome, kind)
}

function resolveReadPath(chainHome: string, kind: ContentKind, slug: string): { path: string; ext?: ContentFileExt; isCore: boolean } {
  const safeSlug = assertSafeSlug(slug)
  const core = isProtected(chainHome, kind, safeSlug)
  const base = kindBaseDir(chainHome, kind, core)

  if (kind === "skills") {
    const path = resolveSkillPath(base, safeSlug)
    if (!existsSync(path)) throw new UserError(`'${safeSlug}' not found.`)
    return { path, isCore: core }
  }

  if (kind === "rules") {
    const found = resolveRuleBySlug(base, safeSlug)
    if (!found) throw new UserError(`'${safeSlug}' not found.`)
    return { path: found.path, ext: found.ext, isCore: core }
  }

  // agents and workflows: flat .md file
  const path = resolveFlatPath(base, safeSlug)
  if (!existsSync(path)) throw new UserError(`'${safeSlug}' not found.`)
  return { path, ext: ".md", isCore: core }
}

function assertExt(kind: ContentKind, ext?: ContentFileExt): ContentFileExt | undefined {
  if (typeof ext === "undefined") return undefined
  if (ext !== ".md" && ext !== ".mdc") {
    throw new UserError("Invalid extension. Use '.md' or '.mdc'.")
  }
  if (kind !== "rules" && ext !== ".md") {
    throw new UserError("Only rules support '.mdc' extension.")
  }
  return ext
}

// Collects user entries for skills (directory-per-skill layout).
function listSkillEntries(chainHome: string, coreSlugs: string[]): ContentListEntry[] {
  const dir = join(chainHome, "skills")
  if (!existsSync(dir)) return []

  const slugs = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => (entry.isDirectory() || entry.isSymbolicLink()) && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .filter((slug) => !coreSlugs.includes(slug))
    .sort()

  const entries: ContentListEntry[] = []
  for (const slug of slugs) {
    const path = resolveSkillPath(dir, slug)
    if (!existsSync(path)) continue
    entries.push({ kind: "skills", slug, isCore: false, path })
  }
  return entries
}

// Collects user entries for flat-file kinds (rules, agents, workflows).
function listFlatKindEntries(chainHome: string, kind: ContentKind, coreSlugs: string[]): ContentListEntry[] {
  const dir = join(chainHome, kind)
  if (!existsSync(dir)) return []

  const files = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)

  // Deduplicate slugs; for rules prefer .md over .mdc when both exist.
  const slugs = new Map<string, ContentFileExt>()
  for (const name of files) {
    const ext = extname(name)
    if (ext !== ".md" && ext !== ".mdc") continue
    if (kind !== "rules" && ext !== ".md") continue
    const slug = basename(name, ext)
    if (!slug || coreSlugs.includes(slug)) continue
    if (kind === "rules") {
      if (!slugs.has(slug) || ext === ".md") slugs.set(slug, ext as ContentFileExt)
    } else {
      slugs.set(slug, ".md")
    }
  }

  return [...slugs.keys()].sort().map((slug) => {
    const ext = slugs.get(slug)!
    return { kind, slug, isCore: false, path: resolveFlatPath(dir, slug, ext), ext }
  })
}

export function listContent(chainHome: string, kind: ContentKind): ContentListEntry[] {
  ensureInitialized(chainHome)
  const contentKind = assertContentKind(kind)
  const protectedAssets = readProtectedCoreAssets(chainHome)
  const coreSlugs = protectedAssets[contentKind]

  const coreEntries: ContentListEntry[] = coreSlugs.map((slug) => {
    const read = resolveReadPath(chainHome, contentKind, slug)
    return { kind: contentKind, slug, isCore: true, path: read.path, ext: read.ext }
  })

  const userEntries =
    contentKind === "skills"
      ? listSkillEntries(chainHome, coreSlugs)
      : listFlatKindEntries(chainHome, contentKind, coreSlugs)

  return [...coreEntries, ...userEntries]
}

export function readContent(chainHome: string, kind: ContentKind, slug: string): ContentReadResult {
  ensureInitialized(chainHome)
  const contentKind = assertContentKind(kind)
  const safeSlug = assertSafeSlug(slug)
  const read = resolveReadPath(chainHome, contentKind, safeSlug)
  return {
    kind: contentKind,
    slug: safeSlug,
    isCore: read.isCore,
    content: readFileSync(read.path, "utf8"),
    path: read.path,
    ext: read.ext,
  }
}

export function createContent(chainHome: string, input: ContentWriteInput): void {
  ensureInitialized(chainHome)
  const kind = assertContentKind(input.kind)
  const slug = assertCreateSlug(kind, input.slug)
  const ext = assertExt(kind, input.ext)
  if (isProtected(chainHome, kind, slug)) {
    throw new UserError(`'${slug}' is a protected core ${kind.slice(0, -1)} and cannot be overwritten.`)
  }

  if (kind === "skills") {
    const path = resolveSkillPath(join(chainHome, "skills"), slug)
    if (existsSync(path)) {
      throw new UserError(`'${slug}' already exists.`)
    }
    mkdirSync(join(chainHome, "skills", slug), { recursive: true })
    writeFileSync(path, input.content, "utf8")
    return
  }

  const base = join(chainHome, kind)
  mkdirSync(base, { recursive: true })
  const existing = kind === "rules" ? resolveRuleBySlug(base, slug) : null
  if (existing || (kind !== "rules" && existsSync(resolveFlatPath(base, slug)))) {
    throw new UserError(`'${slug}' already exists.`)
  }
  const fileExt = kind === "rules" ? (ext ?? ".md") : ".md"
  writeFileSync(resolveFlatPath(base, slug, fileExt), input.content, "utf8")
}

export function updateContent(chainHome: string, input: ContentWriteInput): void {
  ensureInitialized(chainHome)
  const kind = assertContentKind(input.kind)
  const slug = assertSafeSlug(input.slug)
  const ext = assertExt(kind, input.ext)
  if (isProtected(chainHome, kind, slug)) {
    throw new UserError(`'${slug}' is a protected core ${kind.slice(0, -1)} and cannot be modified.`)
  }

  if (kind === "skills") {
    const path = resolveSkillPath(join(chainHome, "skills"), slug)
    if (!existsSync(path)) throw new UserError(`'${slug}' not found.`)
    writeFileSync(path, input.content, "utf8")
    return
  }

  const base = join(chainHome, kind)
  const existing = kind === "rules" ? resolveRuleBySlug(base, slug, ext) : null
  if (kind !== "rules") {
    const path = resolveFlatPath(base, slug)
    if (!existsSync(path)) throw new UserError(`'${slug}' not found.`)
    writeFileSync(path, input.content, "utf8")
    return
  }

  if (existing) {
    writeFileSync(existing.path, input.content, "utf8")
    return
  }
  throw new UserError(`'${slug}' not found.`)
}

export function deleteContent(chainHome: string, kind: ContentKind, slug: string): void {
  ensureInitialized(chainHome)
  const contentKind = assertContentKind(kind)
  const safeSlug = assertSafeSlug(slug)
  if (isProtected(chainHome, contentKind, safeSlug)) {
    throw new UserError(`'${safeSlug}' is a protected core ${contentKind.slice(0, -1)} and cannot be removed.`)
  }

  if (contentKind === "skills") {
    const skillDir = join(chainHome, "skills", safeSlug)
    if (!existsSync(skillDir)) return
    rmSync(skillDir, { recursive: true })
    return
  }

  const base = join(chainHome, contentKind)
  if (contentKind === "rules") {
    const existing = resolveRuleBySlug(base, safeSlug)
    if (!existing) return
    rmSync(existing.path, { force: true })
    return
  }

  rmSync(resolveFlatPath(base, safeSlug), { force: true })
}
