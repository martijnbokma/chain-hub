import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync, rmSync } from "fs"
import { dirname, join, resolve } from "path"
import { fileURLToPath } from "url"
import { parse, stringify } from "yaml"
import { getChainHome } from "./chain-home"

interface EnsureCoreAssetsOptions {
  chainHome?: string
  packageRoot?: string
}

export function ensureCoreAssets(options: EnsureCoreAssetsOptions = {}): void {
  const chainHome = options.chainHome ?? getChainHome()
  const packageRoot = options.packageRoot ?? getPackageRoot()
  const sourceCore = join(packageRoot, "core")
  const targetCore = join(chainHome, "core")

  if (!existsSync(sourceCore)) return

  mkdirSync(chainHome, { recursive: true })
  if (!samePath(sourceCore, targetCore)) {
    cpSync(sourceCore, targetCore, { recursive: true, force: true })
  }

  syncProtectedAgentsAndWorkflowsToUserDirs({ chainHome, packageRoot })
}

// One-time registry migration (schema v3 → v4)
// One-time migration: drop the legacy `core:` bucket that was removed in schema_version 4.
// Skill directories that were only registered under `core:` and are no longer protected are
// deleted from skills/ to avoid false "not in registry" validator errors.
function migrateLegacyCoreField(registryPath: string, skillsDir: string): void {
  let raw: Record<string, unknown>
  try {
    raw = (parse(readFileSync(registryPath, "utf8")) as Record<string, unknown>) ?? {}
  } catch {
    return
  }

  if (!Array.isArray(raw.core)) return

  const coreSlugs = (raw.core as unknown[]).map((s) => String(s))
  delete raw.core

  for (const slug of coreSlugs) {
    const dir = join(skillsDir, slug)
    if (existsSync(dir)) {
      try { rmSync(dir, { recursive: true, force: true }) } catch { /* best-effort */ }
    }
  }

  writeFileSync(registryPath, stringify(raw), "utf8")
}

export function ensureUserRegistry(options: Pick<EnsureCoreAssetsOptions, "chainHome"> = {}): void {
  const chainHome = options.chainHome ?? getChainHome()
  const registryPath = join(chainHome, "skills-registry.yaml")

  mkdirSync(chainHome, { recursive: true })
  mkdirSync(join(chainHome, "skills"), { recursive: true })

  if (existsSync(registryPath)) {
    migrateLegacyCoreField(registryPath, join(chainHome, "skills"))
    return
  }

  writeFileSync(
    registryPath,
    "schema_version: 3\nchain_hub: []\npersonal: []\ncli_packages: []\n",
    "utf8",
  )
}

export function getPackageRoot(): string {
  if (process.env.CHAIN_PACKAGE_ROOT) return process.env.CHAIN_PACKAGE_ROOT

  let current = dirname(fileURLToPath(import.meta.url))
  while (current !== dirname(current)) {
    if (existsSync(join(current, "core", "registry.yaml"))) return current
    current = dirname(current)
  }

  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")
}

function samePath(left: string, right: string): boolean {
  if (!existsSync(left) || !existsSync(right)) return resolve(left) === resolve(right)

  return realpathSync(left) === realpathSync(right)
}

interface PackageCoreRegistry {
  protected?: {
    agents?: unknown
    workflows?: unknown
  }
}

function syncProtectedAgentsAndWorkflowsToUserDirs(options: EnsureCoreAssetsOptions): void {
  const chainHome = options.chainHome ?? getChainHome()
  const packageRoot = options.packageRoot ?? getPackageRoot()
  const registryPath = join(packageRoot, "core", "registry.yaml")

  if (!existsSync(registryPath)) return

  const raw = parse(readFileSync(registryPath, "utf8")) as PackageCoreRegistry
  const agents = normalizeSlugList(raw?.protected?.agents)
  const workflows = normalizeSlugList(raw?.protected?.workflows)

  const destAgents = join(chainHome, "agents")
  const destWorkflows = join(chainHome, "workflows")

  for (const slug of agents) {
    const src = join(packageRoot, "core", "agents", `${slug}.md`)
    if (!existsSync(src)) continue
    mkdirSync(destAgents, { recursive: true })
    cpSync(src, join(destAgents, `${slug}.md`), { force: true })
  }

  for (const slug of workflows) {
    const src = join(packageRoot, "core", "workflows", `${slug}.md`)
    if (!existsSync(src)) continue
    mkdirSync(destWorkflows, { recursive: true })
    cpSync(src, join(destWorkflows, `${slug}.md`), { force: true })
  }
}

function normalizeSlugList(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value.map((item) => String(item)).filter((slug) => slug.length > 0)
}
