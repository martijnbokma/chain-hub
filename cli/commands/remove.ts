import kleur from "kleur"
import { join } from "path"
import { existsSync, rmSync } from "fs"
import { getChainHome } from "../utils/chain-home"
import { collectRegistrySlugs, isProtectedCoreSkill, readRegistry, removeSkill } from "../registry/local"
import { UserError } from "../utils/errors"
import { assertSafeSkillPathSegment } from "../utils/skill-slug"

export async function runRemove(slug: string): Promise<void> {
  const safeSlug = assertSafeSkillPathSegment(slug)
  const chainHome = getChainHome()
  const skillDir = join(chainHome, "skills", safeSlug)

  if (isProtectedCoreSkill(safeSlug)) {
    throw new UserError(
      `'${safeSlug}' is a protected Chain Hub core skill and cannot be removed.\n  Core skills keep Chain Hub functional. Remove only user-installed skills.`,
    )
  }

  const reg = readRegistry()
  const isTracked = collectRegistrySlugs(reg).includes(safeSlug)

  if (!isTracked) {
    throw new UserError(
      `'${safeSlug}' is not in registry.yaml (may be a personal/authored skill).\n  Remove manually from ${skillDir} if needed.`,
    )
  }

  if (existsSync(skillDir)) {
    rmSync(skillDir, { recursive: true })
    console.log(kleur.green(`  ✓ Removed ${skillDir}`))
  }

  removeSkill(safeSlug)
  console.log(kleur.green(`\n  ✓ Removed '${safeSlug}' from registry\n`))
}
