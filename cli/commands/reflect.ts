import kleur from "kleur"
import { join } from "path"
import { getChainHome } from "../utils/chain-home"
import { distillLearnings } from "../utils/learnings"

export async function runReflect(opts: { dryRun?: boolean }): Promise<void> {
  const chainHome = getChainHome()
  
  console.log(kleur.bold("\n  chain reflect\n"))

  const body = distillLearnings(chainHome, opts.dryRun)

  if (!body) {
    console.log(kleur.yellow("  No queued events (inbox empty)."))
    return
  }

  if (opts.dryRun) {
    console.log(body)
    console.log(kleur.yellow("\n  [Dry Run] Above is the content that would be distilled."))
    console.log(kleur.cyan("  To perform an autonomous reflection, an AI agent should analyze this content."))
  } else {
    console.log(kleur.green("  ✓ Learnings distilled into a draft."))
    console.log(kleur.cyan(`  Check ${join(chainHome, "learnings", "drafts")} for the latest draft.`))
    console.log(kleur.bold("\n  Next step: an agent should analyze the draft and propose changes."))
  }
}
