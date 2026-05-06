import kleur from "kleur"
import { getChainHome } from "../utils/chain-home"
import { updateContent, readContent } from "../services/content-service"
import { UserError } from "../utils/errors"

export async function runRename(oldSlug: string, newSlug: string): Promise<void> {
  const chainHome = getChainHome()
  
  // For now, we assume it's a skill if not specified. 
  // In the future we could try to detect or add a --kind option.
  const kind = "skills"
  
  try {
    const existing = readContent(chainHome, kind, oldSlug)
    if (existing.isCore) {
      throw new UserError(`'${oldSlug}' is a protected core skill and cannot be renamed.`)
    }
    
    await updateContent(chainHome, {
      kind,
      slug: oldSlug,
      newSlug,
      content: existing.content,
      ext: existing.ext
    })
    
    console.log(kleur.green(`\n  ✓ Renamed ${kind.slice(0, -1)} '${oldSlug}' to '${newSlug}'\n`))
  } catch (err: any) {
    if (err.message.includes("not found")) {
      throw new UserError(`Skill '${oldSlug}' not found. If you wanted to rename a rule/agent/workflow, use 'chain <kind> rename'.`)
    }
    throw err
  }
}
