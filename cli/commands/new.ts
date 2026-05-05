import kleur from "kleur"
import { join } from "path"
import { getChainHome } from "../utils/chain-home"
import { createSkill } from "../services/skills-service"
import { UserError } from "../utils/errors"

export async function runNew(slug: string): Promise<void> {
  const chainHome = getChainHome()
  try {
    createSkill(chainHome, slug)
    console.log(kleur.green(`\n  ✓ Created ${join(chainHome, "skills", slug)}/SKILL.md`))
    console.log(kleur.dim(`  Registered '${slug}' in skills-registry.yaml (personal). Edit the file, then run: chain validate\n`))
  } catch (error) {
    if (error instanceof UserError) {
      console.error(kleur.red(`\n  ${error.message}\n`))
      process.exit(1)
    }
    throw error
  }
}
