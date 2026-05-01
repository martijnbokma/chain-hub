import kleur from "kleur"
import { searchRemote } from "../registry/remote"

export async function runSearch(query: string): Promise<void> {
  console.log(kleur.bold(`\n  Searching for "${query}"...\n`))

  let results
  try {
    results = await searchRemote(query)
  } catch (e) {
    console.error(kleur.red(`  Could not reach registry: ${(e as Error).message}\n`))
    process.exit(1)
  }

  if (results.length === 0) {
    console.log(kleur.yellow(`  No results found.\n`))
    return
  }

  for (const skill of results) {
    console.log(`  ${kleur.green(skill.slug)}`)
    console.log(kleur.dim(`    ${skill.description}`))
    console.log(kleur.dim(`    source: ${skill.source}  version: ${skill.version}`))
    console.log()
  }

  console.log(kleur.dim(`  Install with: chain add <slug>\n`))
}
