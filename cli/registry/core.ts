import { existsSync, readFileSync } from "fs"
import { join } from "path"
import { parse } from "yaml"
import { getChainHome } from "../utils/chain-home"

interface ProtectedCoreAssets {
  skills: string[]
  agents: string[]
  workflows: string[]
  rules: string[]
}

interface CoreRegistry {
  protected?: Partial<ProtectedCoreAssets>
}

export function readProtectedCoreAssets(chainHome = getChainHome()): ProtectedCoreAssets {
  const path = join(chainHome, "core", "registry.yaml")
  if (!existsSync(path)) {
    return emptyProtectedCoreAssets()
  }

  const registry = (parse(readFileSync(path, "utf8")) as CoreRegistry) ?? {}

  return {
    skills: normalizeSlugs(registry.protected?.skills),
    agents: normalizeSlugs(registry.protected?.agents),
    workflows: normalizeSlugs(registry.protected?.workflows),
    rules: normalizeSlugs(registry.protected?.rules),
  }
}

export function isProtectedCoreSkill(slug: string, chainHome = getChainHome()): boolean {
  return readProtectedCoreAssets(chainHome).skills.includes(slug)
}

function normalizeSlugs(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value.map((slug) => String(slug)).sort()
}

function emptyProtectedCoreAssets(): ProtectedCoreAssets {
  return {
    skills: [],
    agents: [],
    workflows: [],
    rules: [],
  }
}
