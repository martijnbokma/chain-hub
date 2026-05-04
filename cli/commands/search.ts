import kleur from "kleur"
import { searchRemote } from "../registry/remote"
import { chainAddDirectoryHint, searchSkillsDirectory, skillsShPageUrl } from "../registry/skills-directory"

function formatInstalls(count: number): string {
  if (!count || count <= 0) return ""
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M installs`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K installs`
  return `${count} install${count === 1 ? "" : "s"}`
}

export async function runSearch(query: string, opts: { hubOnly?: boolean } = {}): Promise<void> {
  console.log(kleur.bold(`\n  Searching for "${query}"...\n`))

  let hubResults
  try {
    hubResults = await searchRemote(query)
  } catch (e) {
    console.error(kleur.red(`  Chain Hub registry: ${(e as Error).message}\n`))
    process.exit(1)
  }

  const dirHits = opts.hubOnly ? [] : await searchSkillsDirectory(query, 12)

  if (hubResults.length > 0) {
    console.log(kleur.bold("  Chain Hub registry\n"))
    for (const skill of hubResults) {
      console.log(`  ${kleur.green(skill.slug)}`)
      console.log(kleur.dim(`    ${skill.description}`))
      console.log(kleur.dim(`    source: ${skill.source}  version: ${skill.version}`))
      console.log()
    }
    console.log(kleur.dim("  Install with: chain add <slug>\n"))
  }

  if (!opts.hubOnly && dirHits.length > 0) {
    console.log(kleur.bold("  Open directory (skills.sh)\n"))
    for (const hit of dirHits) {
      const installs = formatInstalls(hit.installs)
      console.log(`  ${kleur.green(hit.name)}${installs ? kleur.cyan(`  ${installs}`) : ""}`)
      console.log(kleur.dim(`    ${chainAddDirectoryHint(hit)}`))
      console.log(kleur.dim(`    ${skillsShPageUrl(hit)}`))
      console.log()
    }
    console.log(
      kleur.dim(
        `  Installs into CHAIN_HOME/skills/ via GitHub. Set ${kleur.bold("SKILLS_API_URL")} to use another directory host.\n`,
      ),
    )
  }

  if (hubResults.length === 0 && dirHits.length === 0) {
    const where = opts.hubOnly ? "Chain Hub registry" : "Chain Hub registry or skills.sh"
    console.log(kleur.yellow(`  No results in ${where}.\n`))
  }
}
