import kleur from "kleur"
import { join } from "path"
import { getChainHome } from "../utils/chain-home"
import { createSkill } from "../services/skills-service"

export async function runNew(slug: string): Promise<void> {
  const chainHome = getChainHome()
  createSkill(chainHome, slug)
  const safeSlug = slug.trim()
  console.log(kleur.green(`\n  ✓ Created ${join(chainHome, "skills", safeSlug)}/SKILL.md`))
  console.log(kleur.dim(`  Registered '${safeSlug}' in skills-registry.yaml (personal). Edit the file, then run: chain validate\n`))
}
