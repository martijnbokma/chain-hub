import kleur from "kleur"
import { join } from "path"
import { existsSync, rmSync } from "fs"
import { getChainHome } from "../utils/chain-home"
import { collectRegistrySlugs, isProtectedCoreSkill, readRegistry, removeSkill } from "../registry/local"
import { UserError } from "../utils/errors"

export async function runRemove(slug: string): Promise<void> {
  const chainHome = getChainHome()
  const skillDir = join(chainHome, "skills", slug)

  if (isProtectedCoreSkill(slug)) {
    throw new UserError(
      `'${slug}' is a protected Chain core skill and cannot be removed.\n  Core skills keep Chain Hub functional. Remove only user-installed skills.`,
    )
  }

  const reg = readRegistry()
  const isTracked = collectRegistrySlugs(reg).includes(slug)

  if (!isTracked) {
    throw new UserError(
      `'${slug}' is not in registry.yaml (may be a personal/authored skill).\n  Remove manually from ${skillDir} if needed.`,
    )
  }

  if (existsSync(skillDir)) {
    rmSync(skillDir, { recursive: true })
    console.log(kleur.green(`  ✓ Removed ${skillDir}`))
  }

  removeSkill(slug)
  console.log(kleur.green(`\n  ✓ Removed '${slug}' from registry\n`))
}
