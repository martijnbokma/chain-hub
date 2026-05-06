import kleur from "kleur"
import { basename, join } from "path"
import { readdirSync, existsSync } from "fs"
import { getChainHome } from "../utils/chain-home"
import { readRegistry } from "../registry/local"
import { readProtectedCoreAssets } from "../registry/core"
import {
  type OriginSets,
  printSkillsSection,
  printAssetSection,
  printBundlesSection,
} from "../utils/list-formatter"

function markdownSlugsInDir(dir: string): string[] {
  if (!existsSync(dir)) return []

  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("_"))
    .map((e) => basename(e.name, ".md"))
}

// ---------------------------------------------------------------------------
// Command entry point
// ---------------------------------------------------------------------------

export async function runList(): Promise<void> {
  const chainHome = getChainHome()
  const skillsDir = join(chainHome, "skills")
  const agentsDir = join(chainHome, "agents")
  const workflowsDir = join(chainHome, "workflows")

  const core = readProtectedCoreAssets(chainHome)
  const protectedCoreSkills = core.skills
  const protectedCoreAgents = core.agents
  const protectedCoreWorkflows = core.workflows
  const protectedCoreSet = new Set(protectedCoreSkills)
  const protectedAgentSet = new Set(protectedCoreAgents)
  const protectedWorkflowSet = new Set(protectedCoreWorkflows)

  const userSkillEntries = existsSync(skillsDir)
    ? readdirSync(skillsDir, { withFileTypes: true })
      .filter((e) => (e.isDirectory() || e.isSymbolicLink()) && !e.name.startsWith("_"))
      .map((e) => e.name)
      .filter((slug) => !protectedCoreSet.has(slug))
      .sort()
    : []

  const userAgentSlugs = markdownSlugsInDir(agentsDir)
    .filter((slug) => !protectedAgentSet.has(slug))
    .sort()

  const userWorkflowSlugs = markdownSlugsInDir(workflowsDir)
    .filter((slug) => !protectedWorkflowSet.has(slug))
    .sort()

  const hasAnything =
    protectedCoreSkills.length > 0 ||
    userSkillEntries.length > 0 ||
    protectedCoreAgents.length > 0 ||
    userAgentSlugs.length > 0 ||
    protectedCoreWorkflows.length > 0 ||
    userWorkflowSlugs.length > 0

  if (!hasAnything) {
    console.log(kleur.yellow("\n  No Chain Hub content found. Run 'chain init' and then 'chain setup'.\n"))
    return
  }

  const registry = readRegistry()
  const sets: OriginSets = {
    chainHubSet: new Set(registry.chain_hub || []),
    personalSet: new Set(registry.personal || []),
    packsSet: new Set(registry.packs || []),
    communitySet: new Set(registry.community || []),
  }
  const selfAuthoredSet = new Set(registry.authorship?.self || [])
  const slugGithubRef = new Map<string, string>()
  for (const bundle of registry.github_sources || []) {
    for (const s of bundle.skills || []) {
      slugGithubRef.set(s, bundle.github)
    }
  }

  if (protectedCoreSkills.length > 0 || userSkillEntries.length > 0) {
    printSkillsSection(chainHome, protectedCoreSkills, userSkillEntries, sets, slugGithubRef, selfAuthoredSet)
  }

  if (protectedCoreAgents.length > 0 || userAgentSlugs.length > 0) {
    printAssetSection("agents", chainHome, protectedCoreAgents, userAgentSlugs)
  }

  if (protectedCoreWorkflows.length > 0 || userWorkflowSlugs.length > 0) {
    printAssetSection("workflows", chainHome, protectedCoreWorkflows, userWorkflowSlugs)
  }

  const bundles = registry.github_sources || []
  if (bundles.length > 0) {
    printBundlesSection(bundles)
  }
}
