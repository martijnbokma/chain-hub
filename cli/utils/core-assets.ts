import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "fs"
import { dirname, join, resolve } from "path"
import { fileURLToPath } from "url"
import { parse } from "yaml"
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

export function ensureUserRegistry(options: Pick<EnsureCoreAssetsOptions, "chainHome"> = {}): void {
  const chainHome = options.chainHome ?? getChainHome()
  const registryPath = join(chainHome, "skills-registry.yaml")

  if (existsSync(registryPath)) return

  mkdirSync(chainHome, { recursive: true })
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
