import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "fs"
import { dirname, join, relative, resolve } from "path"
import { fileURLToPath } from "url"
import { parse } from "yaml"
import { getChainHome } from "./chain-home"
import { migrateLegacyCoreField, normalizeSlugList } from "./registry-migration"

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

  syncProtectedAgentsWorkflowsAndRulesToUserDirs({ chainHome, packageRoot })
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
    rules?: unknown
  }
}

/** Resolve `core/rules/<slug>.md` or `core/rules/<slug>.mdc` from packaged core. */
function resolvePackagedRuleSource(packageRoot: string, slug: string): string | null {
  const base = join(packageRoot, "core", "rules")
  const md = join(base, `${slug}.md`)
  if (existsSync(md)) return md
  const mdc = join(base, `${slug}.mdc`)
  if (existsSync(mdc)) return mdc
  return null
}

function syncProtectedAgentsWorkflowsAndRulesToUserDirs(options: EnsureCoreAssetsOptions): void {
  const chainHome = options.chainHome ?? getChainHome()
  const packageRoot = options.packageRoot ?? getPackageRoot()
  const registryPath = join(packageRoot, "core", "registry.yaml")

  if (!existsSync(registryPath)) return

  const raw = parse(readFileSync(registryPath, "utf8")) as PackageCoreRegistry
  const agents = normalizeSlugList(raw?.protected?.agents)
  const workflows = normalizeSlugList(raw?.protected?.workflows)
  const rules = normalizeSlugList(raw?.protected?.rules)

  const destAgents = join(chainHome, "agents")
  const destWorkflows = join(chainHome, "workflows")
  const destRules = join(chainHome, "rules")

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

  const packagedRulesDir = join(packageRoot, "core", "rules")
  for (const slug of rules) {
    const src = resolvePackagedRuleSource(packageRoot, slug)
    if (!src) continue
    mkdirSync(destRules, { recursive: true })
    const destName = relative(packagedRulesDir, src)
    cpSync(src, join(destRules, destName), { force: true })
  }
}
