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
  const coreRegistrySet = new Set(registry.core || [])
  const chainHubSet = new Set(registry.chain_hub || [])
  const personalSet = new Set(registry.personal || [])
  const packsSet = new Set(registry.packs || [])
  const communitySet = new Set(registry.community || [])
  const selfAuthoredSet = new Set(registry.authorship?.self || [])
  const slugGithubRef = new Map<string, string>()
  for (const bundle of registry.github_sources || []) {
    for (const s of bundle.skills || []) {
      slugGithubRef.set(s, bundle.github)
    }
  }

  if (protectedCoreSkills.length > 0 || userSkillEntries.length > 0) {
    console.log(kleur.bold("\n  Protected core skills (" + protectedCoreSkills.length + " total)\n"))
    for (const slug of protectedCoreSkills) {
      console.log("  " + kleur.blue("●") + " " + slug)
    }

    console.log(
      kleur.bold("\n  User-installed skills in " + chainHome + "/skills/ (" + userSkillEntries.length + " total)\n"),
    )

    const slugCol = 36
    const ghCol = 26
    for (const slug of userSkillEntries) {
      const origin =
        coreRegistrySet.has(slug) ? kleur.dim("core")
        : chainHubSet.has(slug) ? kleur.dim("chain-hub")
        : personalSet.has(slug) ? kleur.dim("personal")
        : packsSet.has(slug) ? kleur.dim("pack")
        : communitySet.has(slug) ? kleur.dim("community")
        : kleur.dim("unknown")
      const authorship = selfAuthoredSet.has(slug) ? kleur.yellow("you") : kleur.dim("upstream")
      const gh = slugGithubRef.get(slug)
      let ghPlain = "—"
      if (gh) {
        ghPlain = gh.replace(/^github:/, "")
        if (ghPlain.length > ghCol) ghPlain = ghPlain.slice(0, ghCol - 1) + "…"
      }
      const ghPart = kleur.dim(ghPlain.padEnd(ghCol))
      const line = (dot: string) =>
        console.log("  " + dot + " " + slug.padEnd(slugCol) + " " + origin + "  " + authorship + "  " + ghPart)
      if (coreRegistrySet.has(slug)) {
        line(kleur.blue("●"))
      } else if (chainHubSet.has(slug)) {
        line(kleur.blue("●"))
      } else if (personalSet.has(slug)) {
        line(kleur.green("●"))
      } else if (packsSet.has(slug)) {
        line(kleur.magenta("●"))
      } else if (communitySet.has(slug)) {
        line(kleur.cyan("●"))
      } else {
        line(kleur.dim("○"))
      }
    }

    console.log(
      kleur.dim(
        "\n  ● core · chain-hub · personal · pack · community · unknown    you/upstream    gh = GitHub bundle (owner/repo)\n",
      ),
    )
  }

  if (protectedCoreAgents.length > 0 || userAgentSlugs.length > 0) {
    console.log(kleur.bold("\n  Protected core agents (" + protectedCoreAgents.length + " total)\n"))
    for (const slug of protectedCoreAgents) {
      console.log("  " + kleur.blue("●") + " " + slug + "  " + kleur.dim("(agents/" + slug + ".md)"))
    }

    console.log(
      kleur.bold("\n  User agents in " + chainHome + "/agents/ (" + userAgentSlugs.length + " total)\n"),
    )
    for (const slug of userAgentSlugs) {
      console.log("  " + kleur.green("●") + " " + slug + "  " + kleur.dim("(agents/" + slug + ".md)"))
    }

    console.log(
      kleur.dim(
        "\n  Agents are markdown files linked into your IDE (~/.cursor/agents, ~/.claude/agents, ~/.agents/agents).\n",
      ),
    )
  }

  if (protectedCoreWorkflows.length > 0 || userWorkflowSlugs.length > 0) {
    console.log(kleur.bold("\n  Protected core workflows (" + protectedCoreWorkflows.length + " total)\n"))
    for (const slug of protectedCoreWorkflows) {
      console.log("  " + kleur.blue("●") + " " + slug + "  " + kleur.dim("(workflows/" + slug + ".md)"))
    }

    console.log(
      kleur.bold("\n  User workflows in " + chainHome + "/workflows/ (" + userWorkflowSlugs.length + " total)\n"),
    )
    for (const slug of userWorkflowSlugs) {
      console.log("  " + kleur.green("●") + " " + slug + "  " + kleur.dim("(workflows/" + slug + ".md)"))
    }

    console.log(
      kleur.dim(
        "\n  Workflows are linked per IDE (e.g. Claude Code commands, Windsurf global_workflows).\n",
      ),
    )
  }

  const bundles = registry.github_sources || []
  if (bundles.length > 0) {
    console.log(kleur.bold("\n  GitHub bundles & credits\n"))
    for (const b of bundles) {
      console.log("  " + kleur.cyan("·") + " " + kleur.bold(b.github))
      console.log("    " + kleur.dim(b.credits))
      console.log("    " + kleur.dim("skills: " + (b.skills || []).join(", ")))
    }
    console.log()
  }
}
