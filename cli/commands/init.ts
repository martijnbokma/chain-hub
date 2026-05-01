import kleur from "kleur"
import { getChainHomeResolution } from "../utils/chain-home"
import { ensureCoreAssets, ensureUserRegistry } from "../utils/core-assets"

export async function runInit(): Promise<void> {
  const resolution = getChainHomeResolution()
  const chainHome = resolution.path

  ensureCoreAssets({ chainHome })
  ensureUserRegistry({ chainHome })

  console.log(kleur.dim(`\n  CHAIN_HOME: ${chainHome} (${resolution.source})`))
  console.log(kleur.green(`\n  ✓ Chain Hub core initialized in ${chainHome}\n`))
}
