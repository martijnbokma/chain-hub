import kleur from "kleur"
import { basename, join } from "path"
import { readdirSync, existsSync } from "fs"
import { getChainHome } from "../utils/chain-home"
import { readRegistry } from "../registry/local"
import { readProtectedCoreAssets } from "../registry/core"

function markdownSlugsInDir(dir: string): string[] {
  if (!existsSync(dir)) return []

  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("_"))
    .map((e) => basename(e.name, ".md"))
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

interface OriginSets {
  chainHubSet: Set<string>
  personalSet: Set<string>
  packsSet: Set<string>
  communitySet: Set<string>
}

function resolveOriginMeta(slug: string, sets: OriginSets): { label: string; dot: string } {
  if (sets.chainHubSet.has(slug)) return { label: kleur.dim("chain-hub"), dot: kleur.blue("●") }
  if (sets.personalSet.has(slug)) return { label: kleur.dim("personal"), dot: kleur.green("●") }
  if (sets.packsSet.has(slug)) return { label: kleur.dim("pack"), dot: kleur.magenta("●") }
  if (sets.communitySet.has(slug)) return { label: kleur.dim("community"), dot: kleur.cyan("●") }
  return { label: kleur.dim("unknown"), dot: kleur.dim("○") }
}

function printSkillRow(
  slug: string,
  slugCol: number,
  ghCol: number,
  sets: OriginSets,
  slugGithubRef: Map<string, string>,
  selfAuthoredSet: Set<string>,
): void {
  const { label: origin, dot } = resolveOriginMeta(slug, sets)
  const authorship = selfAuthoredSet.has(slug) ? kleur.yellow("you") : kleur.dim("upstream")
  const gh = slugGithubRef.get(slug)
  let ghPlain = "—"
  if (gh) {
    ghPlain = gh.replace(/^github:/, "")
    if (ghPlain.length > ghCol) ghPlain = ghPlain.slice(0, ghCol - 1) + "…"
  }
  const ghPart = kleur.dim(ghPlain.padEnd(ghCol))
  console.log("  " + dot + " " + slug.padEnd(slugCol) + " " + origin + "  " + authorship + "  " + ghPart)
}

function printSkillsSection(
  chainHome: string,
  protectedCoreSkills: string[],
  userSkillEntries: string[],
  sets: OriginSets,
  slugGithubRef: Map<string, string>,
  selfAuthoredSet: Set<string>,
): void {
  const slugCol = 36
  const ghCol = 26

  console.log(kleur.bold("\n  Protected core skills (" + protectedCoreSkills.length + " total)\n"))
  for (const slug of protectedCoreSkills) {
    console.log("  " + kleur.blue("●") + " " + slug)
  }

  console.log(
    kleur.bold("\n  User-installed skills in " + chainHome + "/skills/ (" + userSkillEntries.length + " total)\n"),
  )
  for (const slug of userSkillEntries) {
    printSkillRow(slug, slugCol, ghCol, sets, slugGithubRef, selfAuthoredSet)
  }

  console.log(
    kleur.dim(
      "\n  ● core · chain-hub · personal · pack · community · unknown    you/upstream    gh = GitHub bundle (owner/repo)\n",
    ),
  )
}

const ASSET_FOOTER: Record<"agents" | "workflows", string> = {
  agents: "\n  Agents are markdown files linked into your IDE (~/.cursor/agents, ~/.claude/agents, ~/.agents/agents).\n",
  workflows: "\n  Workflows are linked per IDE (e.g. Claude Code commands, Windsurf global_workflows).\n",
}

function printAssetSection(
  type: "agents" | "workflows",
  chainHome: string,
  protectedItems: string[],
  userItems: string[],
): void {
  console.log(kleur.bold("\n  Protected core " + type + " (" + protectedItems.length + " total)\n"))
  for (const slug of protectedItems) {
    console.log("  " + kleur.blue("●") + " " + slug + "  " + kleur.dim("(" + type + "/" + slug + ".md)"))
  }

  console.log(
    kleur.bold("\n  User " + type + " in " + chainHome + "/" + type + "/ (" + userItems.length + " total)\n"),
  )
  for (const slug of userItems) {
    console.log("  " + kleur.green("●") + " " + slug + "  " + kleur.dim("(" + type + "/" + slug + ".md)"))
  }

  console.log(kleur.dim(ASSET_FOOTER[type]))
}

function printBundlesSection(bundles: Array<{ github: string; credits: string; skills?: string[] }>): void {
  console.log(kleur.bold("\n  GitHub bundles & credits\n"))
  for (const b of bundles) {
    console.log("  " + kleur.cyan("·") + " " + kleur.bold(b.github))
    console.log("    " + kleur.dim(b.credits))
    console.log("    " + kleur.dim("skills: " + (b.skills || []).join(", ")))
  }
  console.log()
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
