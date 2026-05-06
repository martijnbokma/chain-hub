import kleur from "kleur"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OriginSets {
  chainHubSet: Set<string>
  personalSet: Set<string>
  packsSet: Set<string>
  communitySet: Set<string>
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function resolveOriginMeta(slug: string, sets: OriginSets): { label: string; dot: string } {
  if (sets.chainHubSet.has(slug)) return { label: kleur.dim("chain-hub"), dot: kleur.blue("●") }
  if (sets.personalSet.has(slug)) return { label: kleur.dim("personal"), dot: kleur.green("●") }
  if (sets.packsSet.has(slug)) return { label: kleur.dim("pack"), dot: kleur.magenta("●") }
  if (sets.communitySet.has(slug)) return { label: kleur.dim("community"), dot: kleur.cyan("●") }
  return { label: kleur.dim("unknown"), dot: kleur.dim("○") }
}

export function printSkillRow(
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

export function printSkillsSection(
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

export function printAssetSection(
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

export function printBundlesSection(bundles: Array<{ github: string; credits: string; skills?: string[] }>): void {
  console.log(kleur.bold("\n  GitHub bundles & credits\n"))
  for (const b of bundles) {
    console.log("  " + kleur.cyan("·") + " " + kleur.bold(b.github))
    console.log("    " + kleur.dim(b.credits))
    console.log("    " + kleur.dim("skills: " + (b.skills || []).join(", ")))
  }
  console.log()
}
