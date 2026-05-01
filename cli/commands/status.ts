import kleur from "kleur"
import { allAdapters } from "../adapters"
import { getChainHomeResolution } from "../utils/chain-home"
import { isSymlink } from "../utils/fs"
import { realpathSync } from "fs"

export async function runStatus(): Promise<void> {
  const resolution = getChainHomeResolution()
  const chainHome = resolution.path
  console.log(kleur.bold("\n🔍 chain status"))
  console.log(kleur.dim(`   CHAIN_HOME: ${chainHome} (${resolution.source})\n`))

  let hasErrors = false

  for (const adapter of allAdapters) {
    const detected = adapter.detect()
    if (!detected) {
      console.log(kleur.dim(`  ${adapter.name} — not detected`))
      continue
    }
    console.log(kleur.bold(`  ${adapter.name}`))
    for (const link of adapter.links(chainHome)) {
      if (!isSymlink(link.to)) {
        console.log(kleur.red(`    ✗ ${link.description} — missing or not a symlink`))
        hasErrors = true
        continue
      }
      let resolved: string
      try {
        resolved = realpathSync(link.to)
      } catch {
        console.log(kleur.yellow(`    ⚠ ${link.description} — broken symlink`))
        hasErrors = true
        continue
      }
      if (resolved.startsWith(chainHome)) {
        console.log(kleur.dim(`    ✓ ${link.description}`))
      } else {
        console.log(kleur.yellow(`    ⚠ ${link.description} — points to ${resolved}`))
        hasErrors = true
      }
    }
  }

  console.log(hasErrors ? kleur.yellow("\n  Run `chain setup` to fix issues.\n") : kleur.green("\n  ✓ All symlinks healthy\n"))
}
