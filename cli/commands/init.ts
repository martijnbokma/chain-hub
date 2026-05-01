import kleur from "kleur"
import { getChainHome } from "../utils/chain-home"
import { ensureCoreAssets, ensureUserRegistry } from "../utils/core-assets"

export async function runInit(): Promise<void> {
  const chainHome = getChainHome()

  ensureCoreAssets({ chainHome })
  ensureUserRegistry({ chainHome })

  console.log(kleur.green(`\n  ✓ Chain core initialized in ${chainHome}\n`))
}
