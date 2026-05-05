import kleur from "kleur"
import { join } from "path"
import { getChainHomeResolution } from "../utils/chain-home"
import { ensureCoreAssets, ensureUserRegistry } from "../utils/core-assets"

export async function runInit(): Promise<void> {
  const resolution = getChainHomeResolution()
  const chainHome = resolution.path

  ensureCoreAssets({ chainHome })
  ensureUserRegistry({ chainHome })

  const skillsDir = join(chainHome, "skills")

  console.log(kleur.dim(`\n  CHAIN_HOME: ${chainHome} (${resolution.source})`))
  console.log(kleur.green(`\n  ✓ Chain Hub initialized`))
  console.log(kleur.dim(`    · Core → ${join(chainHome, "core")}`))
  console.log(kleur.dim(`    · Rules → ${join(chainHome, "rules")} (bundled global rules for editor links)`))
  console.log(
    kleur.dim(
      `    · User skills → ${skillsDir} (use chain add / chain new; if you copy folders in by hand, add each slug under personal: in skills-registry.yaml)`,
    ),
  )
  console.log(kleur.dim(`    · Registry → ${join(chainHome, "skills-registry.yaml")}`))
  console.log(kleur.dim(`\n  Next: chain setup\n`))
}
